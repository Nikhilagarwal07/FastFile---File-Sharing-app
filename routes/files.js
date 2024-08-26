const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/file');
const {v4: uuid4} = require('uuid');

//basic config of multer
let storage = multer.diskStorage({
    //passing config
    destination: (req,file,cb)=> cb(null,'uploads/'),
    filename: (req,file,cb)=> {
        //unique name must be generated for file
        const uniqueName = `${Date.now()}-${Math.round(Math.random()*1E9)}${path.extname(file.originalname)}`;
        cb(null,uniqueName);
    }
})

// let upload = multer({
//     storage: storage,
//     limit: {fileSize: 10000000*100},

// }).single('firstfile');
let upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 * 100 },
}).array('files'); // allow multiple file uploads


// router.post('/', (req,res)=>{

//     //store incoming file in uplaods folder
//     upload(req,res, async (err)=>{
//     //validate request
//         if(!req.file){
//             return res.json({ error : 'All fields are required'});

//         }
//         if(err){
//             return res.status(500).send({error: err.message})
//         }
//     //store into database
//         const file = new File({
//             filename: req.file.filename,
//             uuid: uuid4(),
//             path: req.file.path,
//             size: req.file.size
//         });

//         const response = await file.save();
//         return res.json({file: `${process.env.APP_BASE_URL}/files/${response.uuid}`});
//         //http://localhost:3000/files/235657gjhgdcjha-3u2r326tbc2bkjd
//     });

//     //send response (link for downloading)
// })
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (!req.files || req.files.length === 0) {
            return res.json({ error: 'All fields are required' });
        }
        if (err) {
            return res.status(500).send({ error: err.message });
        }

        let fileLinks = [];
        for (let file of req.files) {
            const newFile = new File({
                filename: file.filename,
                uuid: uuid4(),
                path: file.path,
                size: file.size,
            });

            const response = await newFile.save();
            fileLinks.push(`${process.env.APP_BASE_URL}/files/${response.uuid}`);
        }
        return res.json({ files: fileLinks });
    });
});


router.post('/send',async (req,res)=>{
    //validate request
    const { uuid, emailTo} = req.body;
    if(!uuid || !emailTo){
        return res.status(422).send({error: 'All fields are required'});
    }

    //get data from database
    const file = await File.findOne({uuid: uuid});
    if(file.sender){
        return res.status(422).send({error: 'Email already sent'});
    }

    // file.sender = emailFrom;
    file.sender = 'fastfilesharingapp@gmail.com';
    file.receiver = emailTo;

    const response = await file.save();


    //send email
    const sendMail = require('../services/emailService');
    sendMail({
        //from: emailFrom,
        to: emailTo,
        subject: 'FastFile - file sharing app - By Nikhil',
        //text: `${emailFrom} shared a file with you`,
        text: 'fastfilesharingapp@gmail.com shared a file with you',
        html: require('../services/emailTemplate')({
            // emailFrom: emailFrom,
            emailFrom: 'fastfilesharingapp@gmail.com',
            downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}`,
            size: parseInt(file.size/1000) + 'KB',
            expires: '24 hours'
        })

    });

    return res.send({success: true});

});

module.exports = router;