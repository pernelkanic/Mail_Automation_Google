import express from 'express';
import { createLabel, getLabel, sendMailViaQueue } from '../Controller/mailController';
import { getMails, getUser, readMail, sendMail } from './googleAuthRoutes';
// const {sendMail, getUser}  = require("./googleauth.routes")
require("dotenv").config();

const router = express.Router();
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.get("/userInfo/:email", getUser);
router.get("/list/:email",getMails);
router.get("/read/:email/message/:message" , readMail)
router.post("/send/sendmail" , sendMail);
router.post("/createlabel/:email" , createLabel);
router.post("/getLabel/:email/:id" , getLabel);
router.post("/send/:email/:id" , sendMailViaQueue);
export default router;
