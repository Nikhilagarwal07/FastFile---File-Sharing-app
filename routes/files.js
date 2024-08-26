const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const File = require('../models/file');
const { v4: uuid4 } = require('uuid');

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

let upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 * 100 },
}).array('files');

router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (!req.files || req.files.length === 0) {
            return res.json({ error: 'All fields are required' });
        }
        if (err) {
            return res.status(500).send({ error: err.message });
        }

        if (req.files.length === 1) {
            // Only one file uploaded, no need to zip
            const file = new File({
                filename: req.files[0].filename,
                uuid: uuid4(),
                path: req.files[0].path,
                size: req.files[0].size
            });

            const response = await file.save();
            return res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}` });

        } else {
            // Multiple files uploaded, zip them
            const zipFileName = `${uuid4()}.zip`;
            const zipFilePath = path.join(__dirname, `../uploads/${zipFileName}`);

            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level
            });

            output.on('close', async () => {
                const file = new File({
                    filename: zipFileName,
                    uuid: uuid4(),
                    path: zipFilePath,
                    size: archive.pointer()
                });

                const response = await file.save();
                return res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}` });
            });

            archive.on('error', (err) => {
                throw err;
            });

            archive.pipe(output);

            // Add each file to the zip archive
            req.files.forEach(file => {
                archive.file(file.path, { name: file.originalname });
            });

            await archive.finalize();
        }
    });
});

router.post('/send', async (req, res) => {
    const { uuid, emailTo, emailFrom } = req.body;
    if (!uuid || !emailTo || !emailFrom) {
        return res.status(422).send({ error: 'All fields are required' });
    }

    // Find the file in the database using the uuid
    const file = await File.findOne({ uuid: uuid });
    if (!file) {
        return res.status(404).send({ error: 'File not found' });
    }

    if (file.sender) {
        return res.status(422).send({ error: 'Email already sent' });
    }

    file.sender = emailFrom;
    file.receiver = emailTo;

    const response = await file.save();

    // Send the email
    const sendMail = require('../services/emailService');
    sendMail({
        from: emailFrom,
        to: emailTo,
        subject: 'Files shared via FastFile',
        text: `${emailFrom} shared files with you`,
        html: require('../services/emailTemplate')({
            emailFrom: emailFrom,
            downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}`,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, // Display size in MB
            expires: '24 hours'
        })
    });

    return res.send({ success: true });
});


module.exports = router;