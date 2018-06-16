// --- original code, + timeout

function loadImage(src,i,onLoad){
  return new Promise((resolve,reject)=>{
    if(typeof src=="string"){
      src={
        name:"image"+i,
        src,
      };
    }

    let img=new Image();
    src.img=img;

    const job = setTimeout (
      _ => reject ('Timed out loading img: ' + src.src),
      2000,
    )

    img.addEventListener("load",(event)=>{
      if(typeof onLoad=="function"){
        onLoad.call(null,img,i);
      }

      clearTimeout (job)

      resolve(src);
    });
    img.src=src.src;
  })
}

function loadImages(images,onLoad){
  return Promise.all(images.map((src,i)=>{
    return loadImage(src,i,onLoad);
  }));
}

export default function ImageLoader(images,onLoad){
  return new Promise((resolve,reject)=>{
    loadImages(images,onLoad).then((loadedImages)=>{
      let r={};
      loadedImages.forEach((curImage)=>{
        r[curImage.name]={
          img:curImage.img,
          src:curImage.src,
        };
      })

      resolve(r);
    });
  })
}
