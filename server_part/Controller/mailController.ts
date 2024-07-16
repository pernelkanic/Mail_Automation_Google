import axios from 'axios';
import { Queue } from 'bullmq';
import { Request, Response } from 'express';
import connection, { redisGetToken } from '../helpers/redis.middleware';

const sendmailqueue = new Queue("email-queue" , {connection});
type BodyType = {
    from :string,
    to :string,
    token : string | null,
    id: string
}

export const sendMailViaQueue= async(req : Request, res: Response)=>{
    try{
    const{email , id }  = req.params;
    const{from , to} = req.body;
    const token = await redisGetToken(email);
    if(!token){
      return   res.status(400).json({
            message: "token not present"
        })
    }
    await init({from , to , token , id});
    res.send("the email is queued successfully");

    }
    catch(e : unknown){
        const err = e as Error
        throw new Error("the error has occured "  + err);
    }
}

export async function createLabel(req :Request , res:Response){
    try{
        const token = await redisGetToken(req.params.email);
        if(!token){
            return res.json({
                "message" : "token is not found"
            })
        }
        const label = req.body;
        const response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/labels`, label,
            {
                headers :{
                    "Content-Type" :"application/json",
                    "Authorization":`Bearer ${token}`
                }
            }

        );
        res.status(200).json(response.data);
    }
    catch(e :unknown){
        const error = e as Error
        res.status(400).json({error : error.message});
        throw new Error("the error has occured" + error);
    }
}
export async function getLabel(req: Request , res: Response){
    try{
        const token = await redisGetToken(req.params.email);
        const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/labels/${req.params.id}`;
        if(!token){
            return res.json({
                "message" : "token is not found"
            })
        }
        const config = {
            method : `get`,
            url : url,
            headers :{
                'Authorization' :`Bearer ${token}`
            }
        }
        const response = await axios(config);
        res.json(response.data);
    }
    catch(e: unknown){
        const error = e as Error
        throw new Error("the error has occured in the get Label function" + error);
    }
}

 async function init(body : BodyType){
    const res = await sendmailqueue.add(
        "email-queue" , 
        {
            from :body.from,
            to:body.to,
            id:body.id

        },
        {removeOnComplete :true}
    )
    console.log("The job is scheduled" , res.id);
}