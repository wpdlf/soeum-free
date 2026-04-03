const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('sync-mysql');
const env = require('dotenv').config({ path: "../../.env" });
const axios = require('axios');
const { type } = require('os');

var connection = new mysql({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/hello', (req, res) => {
    res.send('Hello World~!!');
})

app.get('/select', (req, res) => {
    const result = connection.query('select * from user');
    console.log(result);
    res.send(result);
})

app.get('/get_dong_data', (req, res) => {
    var region = req.query.region;
    axios
        .get('http://192.168.1.158:3000/get_dong_data', { params: { region } })
        .then(response => {
            console.log(`statusCode : ${response.status}`)
            console.log(response.data);
            res.send(String(response.data[0]['noise']));
        })
        .catch(error => {
            console.log(error)
        })
})

app.get('/users', (req, res) => {
    axios
        .get('http://192.168.1.158:5000/users')
        .then(response => {
            console.log(`statusCode : ${response.status}`)
            console.log(response.data);
            res.send(response.data);
        })
        .catch(error => {
            console.log(error);
        })
})

module.exports = app;