import axios from 'axios';
import express, { Request, Response } from 'express';
import { OAuth2Client } from "google-auth-library";
import { google } from 'googleapis';
import { Base64 } from 'js-base64';
import { createConfig } from '../helpers/Config';
import connection, { redisGetToken } from '../helpers/redis.middleware';
require("dotenv").config();
const googleRouter = express.Router();

const oAuth2Client = new OAuth2Client({
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    redirectUri: process.env.OAUTH_REDIRECT_URI,
});
oAuth2Client.setCredentials({refresh_token:process.env.OAUTH_REFRESH_TOKEN})
const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
];
//starting point of the application for auth
googleRouter.get("/auth/google", (
    req,
    res
) => {

    const authUrl =  oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
    });
    res.redirect(authUrl);
});

//after auth the callback is done to this endpoint
let accessToken : string;
// Handle Google OAuth callback
googleRouter.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code missing.');
    }

    try {
        const { tokens } = await oAuth2Client.getToken(code as string) ;
        const { access_token, refresh_token, scope } = tokens ;
        accessToken = access_token as string;
        console.log(accessToken);
        oAuth2Client.setCredentials(tokens);
        res.send("The callback is done")
    } catch (error) {
        const myerr = error as Error
        console.error('Error exchanging authorization code:', myerr.message);
        res.status(500).send('Error exchanging authorization code.');
    }
});
//get the usermaildetails using email id;
export const getUser = async (req : Request, res : Response) => {
    try {



      const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/profile`;
  
      const token = accessToken
      
      connection.setex(req.params.email, 3600,accessToken );
  
      if (!token) {
        return res.send("Token not found , Please login again to get token");
      }
  
      const config = createConfig(url, token);
  
      const response = await axios(config);
  
      res.json(response.data);




    } catch (error) {
        const myerror = error as Error
      console.log("Can't get user email data ", myerror.message);
      res.send(myerror.message);
    }
  };
export const getMails = async(req : Request, res: Response) =>{
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages?maxResults=50`;
        const token = await redisGetToken(req.params.email);
        if(!token){
            res.send("The token is not there");
        }
        const config  = createConfig(url,token);
        const response = await axios(config);
        res.json(response.data);

    }
    catch(e : unknown){
        const myerr = e as Error
        res.send(myerr.message);

    }

}
export const readMail = async(req : Request, res: Response) =>{
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages/${req.params.message}`;
        const token= await redisGetToken(req.params.email);
        if(!token){
            res.send("The token is not there");
        }
        const config = createConfig(url, token);
        const response = await axios(config);
        let data = await response.data;
        res.json(data);
    }
    catch(e : unknown){
        const myerr = e as Error
        res.send(`The error has occured ${myerr.message}`)
    }

}
export const sendMail = async(req :Request , res : Response) =>{
    try{
        const token = await redisGetToken(req.body.email) as string;
        if(!token){
            return res.send("The token is not there");
        }
        const email= req.body.email;
        const body = req.body.body as string;
        const gmail = google.gmail({version :'v1', auth:oAuth2Client});
        const emailcontent = [
            "to :vijayjulius5555@gmail.com",
            "Content-Type :text/plain; charset=utf-8",
            'Subject : summa mail',
            "",
           body
        ].join("\n");
        const encodemessagecontent  = Base64.encodeURI(emailcontent) as string;
        await gmail.users.messages.send({
            userId:'me',
            requestBody:{
              raw:  encodemessagecontent
            }

        })
        console.log("the email is sent bro!");
        res.send("the email is sent brother!");

    }
    catch(e : unknown){
        const err = e as Error;
        throw new Error(`An error has occured ${err}`);
    }

}
export default googleRouter