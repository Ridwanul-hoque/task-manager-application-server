const express = require('express')
const app = express();
const jwt = require('jsonwebtoken')
const cors = require('cors');
require('dotenv').config()
const port = process.env.port || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8gt7g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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





    const usersCollection = client.db("Task-manager").collection("users")
    const taskcollection = client.db("Task-manager").collection("tasks")



    // jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // middlewares
    const verifyToken = ((req, res, next) => {
      console.log('inside verify headers', req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'forbidden access' })

        }
        req.decoded = decoded
        next()
      })
    })





    // users

    app.get('/users', async (req, res) => {
      console.log(req.headers)
      const result = await usersCollection.find().toArray();
      res.send(result)
    });
    app.get('/users', async (req, res) => {
      console.log(req.headers)
      const result = await usersCollection.find().toArray();
      res.send(result)
    });

    // app.get('/users/admin/:email', verifyToken, async (req, res) => {
    //     const email = req.params.email;
    //     if (email !== req.decoded.email) {
    //         return res.status(403).send({ message: 'unauthorized access' })
    //     }
    //     const query = { email: email }
    //     const user = await usersCollection.findOne(query);
    //     let admin = false;
    //     if (user) {
    //         admin = user?.role === 'admin';

    //     }
    //     res.send({ admin })

    // })
    // app.patch('/users/admin/:id', verifyToken, async (req, res) => {
    //     const id = req.params.id;
    //     const filter = { _id: new ObjectId(id) }
    //     const updatedDoc = {
    //         $set: {
    //             role: 'admin'
    //         }
    //     }
    //     const result = await usersCollection.updateOne(filter, updatedDoc)
    //     res.send(result)
    // })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })




    // app.post('/users', async (req, res) => {
    //   const user = req.body;
    //   const query = { email: user.email }
    //   const existingUser = await usersCollection.findOne(query)
    //   if (existingUser) {
    //     return res.send({ message: 'user already exists', insertedId: null })
    //   }
    //   const result = await usersCollection.insertOne(user);
    //   res.send(result)
    // })





    // tasks
    // app.post('/tasks', async (req, res) => {
    //   const { title, description, category } = req.body;

    //   if (!title || title.length > 50) {
    //     return res.status(400).send({ message: "Title is required and must be 50 characters or less." });
    //   }

    //   if (description && description.length > 200) {
    //     return res.status(400).send({ message: "Description must be 200 characters or less." });
    //   }

    //   const newTask = {
    //     title,
    //     description: description || '',
    //     timestamp: new Date().toISOString(),
    //     category
    //   };

    //   const result = await taskcollection.insertOne(newTask);
    //   res.send(result);
    // });

    app.post('/tasks', async (req, res) => {
      const { title, description, category } = req.body;

      if (!title || title.length > 50) {
        return res.status(400).send({ message: "Title is required and must be 50 characters or less." });
      }

      if (description && description.length > 200) {
        return res.status(400).send({ message: "Description must be 200 characters or less." });
      }

      // Get the highest position in the category
      const lastTask = await taskcollection.find({ category }).sort({ position: -1 }).limit(1).toArray();
      const newPosition = lastTask.length > 0 ? lastTask[0].position + 1 : 0;

      const newTask = {
        title,
        description: description || '',
        timestamp: new Date().toISOString(),
        category,
        position: newPosition
      };

      const result = await taskcollection.insertOne(newTask);
      res.send(result);
    });



    app.get('/tasks', async (req, res) => {
      const tasks = await taskcollection.find().sort({ category: 1, position: 1 }).toArray();
      res.send(tasks);
    });


    // app.get("/tasks", async (req, res) => {
    //   const tasks = await taskcollection.find().toArray();
    //   res.send(tasks);
    // });

    // app.put("/tasks/:id", async (req, res) => {
    //   const { id } = req.params;
    //   const updatedTask = req.body;
    //   const result = await taskcollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedTask });
    //   res.send(result);
    // });

    app.delete("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const result = await taskcollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch('/tasks/reorder', async (req, res) => {
      const { updatedTasks } = req.body;

      const bulkOps = updatedTasks.map((task, index) => ({
        updateOne: {
          filter: { _id: new ObjectId(task._id) },
          update: { $set: { position: index } }
        }
      }));

      const result = await taskcollection.bulkWrite(bulkOps);
      res.send(result);
    });



    app.put('/tasks/:id', async (req, res) => {
      const id = req.params.id;
      const { _id, ...updatedTask } = req.body; // Exclude _id from the update
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedTask };

      const result = await taskcollection.updateOne(filter, updateDoc);
      res.send(result);
    });












    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('task manager is live');
})

app.listen(port, () => {
  console.log(`Task Manger is sitting on Port ${port}`);
})