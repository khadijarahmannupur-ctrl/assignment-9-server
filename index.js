const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express()
const port = process.env.PORT;

app.use(cors());
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    
    const db = client.db("mediqueue");
    const tutorsCollection = db.collection("tutors");
    const addTutorCollection = db.collection("addTutors");

    app.get('/tutors', async(req, res)=> {
      const result = await tutorsCollection.find().toArray();
      res.send(result);
    })

    app.get('/feature', async(req, res)=> {
      const result = await tutorsCollection.find().limit(6).toArray();
      res.send(result);
    })

    app.get('/tutors/:tutorId', async(req, res)=> {
      const {tutorId} = req.params;
      const result = await tutorsCollection.findOne({_id : new ObjectId(tutorId)});
      res.send(result);
    })

    app.get('/addTutor', async(req, res)=> {
      const result = await addTutorCollection.find().toArray();
      res.send(result);
    })

    app.post('/addTutor', async(req, res)=> {
      const tutorData = req.body;
      console.log(tutorData)
      const result = await addTutorCollection.insertOne(tutorData);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
