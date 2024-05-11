const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;
var jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());

const stripe = require("stripe")('sk_test_51PBfLd2KZrTTgp2niaMJOZgNn7sHMeSCgqGgWlzjgStz5ynCHXo5mZwq66epo9HJYmC3po0Ilbg1BwtVO9rmFveR00wWSBduyb');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qvgg1my.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    // await client.connect();
   

    const menuCollection = client.db('BanglaBhaiDB').collection("menu");
    const reviewCollection = client.db('BanglaBhaiDB').collection("reviews");
    const cartCollection = client.db('BanglaBhaiDB').collection("carts");
    const usersCollection = client.db('BanglaBhaiDB').collection("users");
    const paymentCollection = client.db('BanglaBhaiDB').collection("payments");



    // jwt related Apis


    app.post('/jwt',async(req, res)=>{
      const user = req.body;
      const token = jwt.sign({user},process.env.ACCESS_TOKEN,{ expiresIn: '1h' })
      res.send({token}); 
    })

    // middleware
    const verifyToken = (req,res,next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message:'forbidden access'})
      }
      const token= req.headers.authorization.split(' ')[1]
      jwt.verify(token,process.env.ACCESS_TOKEN,function(err,decoded){
        if(err){return res.status(401).send({message:'forbidden access'})}
        req.decoded = decoded;
        next();
      })
    }

    // const verifyAdmin = async(req, res, next)=>{
    //   const email = req.decoded.email;
    //   const query ={email: email}
    //   const user = await usersCollection.findOne(query)
    //   const isAdmin = user?.role==='admin'
    //   if(!isAdmin){res.status(403).send({message:'unauthorized access'})}
    //   next();
    // }

    const verifyAdmin = async (req, res, next) => {
      try {
        const email = req.decoded.user.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        
        if (!user || user.role !== 'admin') {
          return res.status(403).send({ message: 'Unauthorized access' });
        }
    
        next();
      } catch (error) {
        console.error('Error in verifying admin:', error);
        res.status(500).send({ message: 'Internal server error' });
      }
    };
    
    app.get('/users/isadmin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      
      // Ensure the decoded email exists and matches the requested email
      if (!req.decoded || req.decoded.user.email !== email) {
        return res.status(403).send({ message: 'unauthorized access' });
      }
      
      try {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        
        let admin = false;
        if (user) {
          admin = user.role === "admin";
        }
        res.send({ admin });
      } catch (error) {
        console.error("Error in fetching user:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });
    
    // check user admin or not?
    // app.get('/users/isadmin/:email',verifyToken,async(req, res)=>{
    //   const email = req.params.email;
    //   // console.log(email);

    //   if(email!== req.decoded.email){
    //     res.status(403).send({message:'unauthorized access'})
    //   }
    //   const query = {email: email}
    //   const user = await usersCollection.findOne(query)
    //   let admin = false;
    //   if(user){
    //     admin  = user?.role==="admin"
    //   }
    //   console.log(admin);
      
    //   res.send({admin})
    // })
  



  //users
   app.get('/users',verifyToken,verifyAdmin,async(req, res)=>{
    const result = await usersCollection.find().toArray();
    res.send(result);
   })
 
   app.post('/users',async(req, res)=>{
    const user = req.body;
    const query = {email: user.email}
    const exist = await usersCollection.findOne(query);
    if(exist){
      return res.send({message:'user already exists',insertId: null})
    }
    const result = await usersCollection.insertOne(user);
    res.send(result);
   })

   app.delete('/users/:id',verifyToken,verifyAdmin, async(req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id)}
    const result = await usersCollection.deleteOne(query);
    res.send(result); 
  })

  app.patch('/users/admin/:id',verifyToken,verifyAdmin, async(req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id)}
    const updatedDoc = {
      $set:{
        role: 'admin',
      }
    }
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })



    //menu
    app.get('/menu',async(req,res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    })
   
    
    app.get('/menu/:id',async(req,res) => {
      const id= req.params.id;
      const query = {_id: (id)};
      const result = await menuCollection.findOne(query);
      res.send(result);
    })
    
    app.post('/menu',async(req,res) => {
      const item = req.body; 
      const result = await menuCollection.insertOne(item);
      res.send(result);
    })


    app.patch('/menu/:id',async(req,res) => {
       const item = req.body;
       const id=req.params.id;
       const filter ={_id: (id)}
       const updatedDoc = {
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
       }
       const result = await menuCollection.updateOne(filter, updatedDoc);
       res.send(result);
    })
    

    app.delete('/menu/:id', async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result);
    })

    //review
    app.get('/reviews',async(req,res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })


    //cart 

    app.get('/carts',async(req,res) => {
      const email = req.query.email;
      const query= {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/carts/:id',async(req,res) => {
      const id = req.params.id;
      const query= {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    app.post('/carts',async(req,res)=>{
      const cartItem = req.body; 
      const result= await cartCollection.insertOne(cartItem);
      res.send(result);
    })




    // server for the payment gateway Stripe

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price*100)

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });



    app.get('/payments/:email',async(req, res)=>{
    
      const query = {email: req.params.email};
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    
    // save payment data and clear users cart
    app.post('/payments',async(req,res) => {
      const payment  = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      const query = {_id: {
        $in: payment.cartIds.map(id=> new ObjectId(id))
      }}

      const deleteResult = await cartCollection.deleteMany(query);
      res.send({paymentResult,deleteResult})
    })


    // admin Home statistics collection here
    app.get('/admin-stats',async(req,res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();


      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray();

    const revenue = result.length>0 ? result[0].totalRevenue :0;

    res.send({
      users,
      menuItems,
      orders,
      revenue
    })

    })
    

    // orders statistics here joining two table with some data
    app.get('/order-stats',async(req,res) => {
      const result = await paymentCollection.aggregate([
        {
          $unwind: '$menuItemIds'
        },
        {
          $lookup: {
            from: 'menu',
            localField: 'menuItemIds',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        {
          $unwind: '$menuItems'
        },
        {
          $group:{
            _id: '$menuItems.category',
            quantity: {$sum:1},
            revenue: {$sum: '$menuItems.price'}
          }
        },
        {
          $project:{
            _id: 0,
            category: '$_id',
            quantity: '$quantity',
            revenue: '$revenue'
          }
        }
      ]).toArray();

      res.send(result)
    })










    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req, res) =>{
    res.send('Bangla Bhai Running')
})
app.listen(port,()=>{
    console.log(`Bangla Bhai Running on ${port}`);
});