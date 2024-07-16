
export const createConfig  = (url:string,accesstoken:any )  =>{
    return {
        method:"GET",
        url: url,
        headers:{
            Authorization:`Bearer ${accesstoken}`,
            'Content-Type' :'application/json'
        }

    }
}