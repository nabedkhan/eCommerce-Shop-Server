const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const app = express();
dotenv.config();

const serviceAccount = require('./firebaseKey/nabed-ecommerce-shop-firebase-adminsdk-rrlv9-154171e922.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.send('Backend Server is Ready');
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ap9jd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const productsCollection = client.db(process.env.DB_NAME).collection("products");
    const ordersCollection = client.db(process.env.DB_NAME).collection("orders");
    const usersCollection = client.db(process.env.DB_NAME).collection("users");

    // get all products from database and send them to frontend
    app.get('/products', (req, res) => {
        productsCollection.find({})
            .toArray((err, data) => {
                res.json(data);
            })
    });

    // find single product from database
    app.get('/products/:id', (req, res) => {
        productsCollection.find({ _id: ObjectId(req.params.id) })
            .toArray((err, data) => {
                res.json(data[0]);
            })
    });

    // order completion details post in database
    app.post('/orderComplete', (req, res) => {
        const order = req.body;
        ordersCollection.insertOne(order)
            .then(data => res.send(data.insertedCount > 0))
            .catch(err => res.send(err))
    });

    // get specific user order from database
    app.get('/myOrders', (req, res) => {
        const bearerToken = req.headers.authorization;

        if (bearerToken && bearerToken.startsWith('Bearer')) {
            const idToken = bearerToken.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(decodedToken => {
                    const email = decodedToken.email;
                    if (email === req.query.email) {
                        ordersCollection.find({ "userInfo.email": email })
                            .toArray((err, data) => {
                                if (!err) {
                                    res.json(data);
                                } else {
                                    res.send('data not found');
                                }
                            })
                    } else {
                        res.status(401).send('Token is invalid');
                    }
                })
        } else {
            res.status(401).send('Unauthorized Access');
        }
    });

    // get order details from database
    app.get('/orders/:id', (req, res) => {
        const bearerToken = req.headers.authorization;
        if (bearerToken && bearerToken.startsWith('Bearer')) {
            const idToken = bearerToken.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(decodedToken => {
                    const email = decodedToken.email;
                    if (email) {
                        ordersCollection.find({ _id: ObjectId(req.params.id) })
                            .toArray((err, data) => {
                                if (!err) res.json(data[0])
                            })
                    } else {
                        res.status(401).send('Unauthorized Access');
                    }
                })
        } else {
            res.status(401).send('Unauthorized Access');
        }
    });

    // get admin user from database
    app.get('/users/admin', (req, res) => {
        console.log(req.body);
        if (req.query.email) {
            usersCollection.find({ email: req.query.email })
                .toArray((err, data) => {
                    if (data.length > 0) {
                        res.send(true);
                    } else {
                        res.send(false);
                    }
                })
        } else {
            res.status(401).send('Token is invalid');
        }
    })

    // // insert new admin user
    // app.post('/users/admin', (req, res) => {
    //     const { email } = req.body
    //     usersCollection.insertOne({ email })
    //         .then(data => res.send(data.insertedCount > 0))
    //         .catch(err => res.send(err))
    // })

    // // all products post in database
    // app.post('/addProducts', (req, res) => {
    //     productsCollection.insertMany(products)
    //         .then(data => res.send(data.insertedCount > 0))
    //         .catch(err => res.send(err))
    // });

    // // delete all products from database
    // app.delete('/productsDelete', (req, res) => {
    //     productsCollection.deleteMany({})
    //         .then(data => res.send(data))
    //         .catch(err => res.send(err))
    // })

    console.log('Database Connected!');
});

app.listen(process.env.PORT || 5000);