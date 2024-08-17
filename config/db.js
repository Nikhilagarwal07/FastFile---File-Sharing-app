require('dotenv').config();

const mongoose = require('mongoose');

function connectDB() {
    mongoose.connect(process.env.MONGO_CONNECTION_URL)
    .then(() => {
        console.log('Database connected.');
    })
    .catch(err => {
        console.log('Connection failed', err);
    });
}

module.exports = connectDB;
