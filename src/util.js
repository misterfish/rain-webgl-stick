import axios from 'axios'

export const axiosGet = (...args) => axios.get (...args)
export const allP     = (...args) => Promise.all (...args)
