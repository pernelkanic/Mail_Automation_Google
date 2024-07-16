import router from "./Routes/Routes";
import googleRouter from "./Routes/googleAuthRoutes";

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
require("dotenv").config();




app.use(bodyParser.json());
app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "any_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// MessageRoutes
app.use("/",googleRouter );
app.use("/api/mail", router);
// app.use("/", outlookRouter);



app.listen(process.env.PORT, () => {
    console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});



// const oauth2Client = new OAuth2(
//     OAUTH_CLIENT_ID,
//     OAUTH_CLIENT_SECRET,
//     'https://developers.google.com/oauthplayground'
// );


// oauth2Client.setCredentials({
//     refresh_token: OAUTH_REFRESH_TOKEN
// });
// const express = require("express");

// require("dotenv").config();

// const app = express();

// app.listen(process.env.PORT, () => {
//   console.log("listening on port " + process.env.PORT);
// });

// app.get("/", async (req : Request , res : Response) => {
//   // const result=await sendMail();
//   res.sen("Welcome to Gmail API with NodeJS");
// });

// const accessToken = oauth2Client.getAccessToken()