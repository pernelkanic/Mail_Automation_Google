import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { Worker } from "bullmq";
import { createConfig } from "./helpers/Config";
import connection, { redisGetToken } from "./helpers/redis.middleware";
import { sendEMail } from "./Routes/googleAuthRoutes";


type data = {
    to : string
    from :string,
    id?: number
}
interface Part {
    mimeType: string;
    body: {
      data: string;
    };
    
  }
  const genAI = new GoogleGenerativeAI(process.env.API_KEY as string);

const sendEmail = async (data :data, jobId : number) =>{
    new Promise(async(req, res) =>{
         await parseAndSendMail(data);
  
    }).then((res) => console.log(res))
      .catch((err) => console.log(err));
      
}

const mailWorker = new Worker("email-queue" , async(job : any) =>{
    const {from , to , id} = job.data;
    const result = setTimeout(async() => {
        await sendEmail(job.data, job.id);
    }, 5000);
    console.log("job in progress");
    
} , {connection});


const parseAndSendMail = async (data: data)=> {
    try{
        const {from , to } = data ;
        const token = await redisGetToken(from);

        
        if(!token){
            return "Token is not there";
        }
        const url = `https://gmail.googleapis.com/gmail/v1/users/${from}/messages/${data.id}`;
        const config = createConfig(url , token);
        const message = await axios(config);
        console.log("im after the axios config ");
        const payload  = message.data.payload;
        const headers = payload.headers as { name: string, value: string }[];
        const subject = headers.find((header )=>header.name === "Subject")?.value
        
        let textcontext  = "";
        if(payload.parts){
            const textpart = payload.parts.find(
                (part: Part ) => part.mimeType === "text/plain"
            );
            if (textpart) {
                // Decode base64 encoded text and convert to UTF-8
                textcontext = Buffer.from(textpart.body.data, "base64").toString("utf-8");
            }
        } else {
            // If payload does not have parts, decode main payload body
            textcontext = Buffer.from(payload.body.data, "base64").toString("utf-8");
        }

        let snippets = message.data.snippet;
        console.log(snippets);
        
        let emailcontext = `${subject}${snippets}${textcontext}`;
        let emailcontextfinal = emailcontext.slice(0 ,4000);
        // create openai response : read the email and identify the label and send the mail based on it.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
          };
          const customPrompt = `okay now you are an email labeler and you are only to to give me three responses to this email. which will be "Interested", "Not Interested", "More Information" based on the email content you have to give me the label.
  you are strictly prohibited to give any other response or summary of the email. you only have to give me lables.
  And only three labels are allowed. And only give lable as interested if you are sure we have to give reply to this email. if you are not sure then give lable as "More Information" and if you are sure we should not reply to this email then give lable as "Not Interested".
  and if there are any jobs or blogs from medium you  can give intrested label to those emails. and if there are any emails from noreply or no-reply then you can give the label as "Not Interested" and if you are not able to understand the email content then you can ignore the email and give the label as "More Information"

  `;
  const prompt = `${customPrompt}\nEmail Content:\n${emailcontextfinal} and here is the sender of the email ${from} if you are not able to understand the email content then you can ignore the email and give the label as "More Information and if the sender email is has any thing like "noreply" or "no-reply" then you can give the label as "Not Interested" and if you are sure we have to reply to this email then give the label as "Interested"`;
          const response = await model.generateContent(prompt);
        const parsedres = response.response?.candidates?.[0]?.content?.parts?.[0]?.text ;
        console.log(parsedres);
        let label;
        if(parsedres?.includes("Not Interested")){
            label = "Not Interested";
        }
        else if(parsedres?.includes("More Information")){
            label = "More Information";
        }
        else{
            label = "Interested";
        }
        const datatosend = {
            subject,
            textcontext,
            snippet:message.data.snippet as string,
            label,
            from,
            to,
            token
        }
        if(label ==='Interested' || label === 'More Information'){
        console.log("label is there");
        
           await sendEMail(datatosend);
           console.log("the email is sent to the vijayjulius5555");
           return;
        }
        console.log("the mail is not sent , cuz the label is not interested");
        
        

    }
    catch(e : unknown){
        const err = e as Error;
        throw new Error("error has occured in parseandsendmail , cant fetch mail" + err);
    }
}


