const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const knex = require('knex');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; 

const db = knex({
	client: 'pg',
	connection: {
		connectionString: process.env.DATABASE_URL,
		ssl: true,
	}
});

const app =express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());


app.get('/',(req, res)=> {
	db.select('*').from('users')
	.then(data => res.json(data))
	.catch(err => res.status(400).json('unable to get users'))
})

app.post('/signin',(req, res) => {
	db.select('email','hash').from('login')
	.where('email','=', req.body.email)
	.then(data => {
		const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
		if (isValid){
			return db.select('*').from('users')
			.where('email','=',req.body.email)
			.then(user => {
				res.json(user[0])
			})			
			.catch(err => res.status(400).json('unable to get user'))
		}
		else
			res.status(400).json('wrong credentials')
	})
	.catch(err => res.status(400).json('wrong credentials'));
})

app.post('/updateLogin', (req,res) => {
	db.select('*').from('users')
	.where('email','=',req.body.email)
	.update({
		login: new Date()})
	.catch(err => res.status(400).json('unable to get entries'))
	})

app.post('/register', (req, res) => {
	const { email, name, password } = req.body;
	const hash = bcrypt.hashSync(password, 10);
	  db.transaction(trx => {
		trx.insert({
		  hash: hash,
		  email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
		  return trx('users')
			.returning('*')
			.insert({
			  email: loginEmail[0],
			  name: name,
			  registration: new Date(),
			  login: new Date()
			})
			.then(user => {
			  res.json(user[0]);
			})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	  })
	  .catch(err => res.status(400).json(err))
  })

app.post('/update', (req,res) => {
		const { id, status } = req.body;
		db.select('*').from('users')
		.whereIn('id', id)
		.update({
			status: status})
		.catch(err => res.status(400).json('unable to get entries'))
		})

app.delete('/del',(req,res) => {
		const { id, email } = req.body;
		db.select('*').from('users')
		.whereIn('id', id)
		.del()
		.then(data => res.json(data))
		.catch(err => res.status(400).json('unable to get entries'))	
		
		db.select('*').from('login')
		.whereIn('email', email)
		.del()
		.then(data => res.json(data))
		.catch(err => res.status(400).json('unable to get entries'))	
		})

app.listen(process.env.PORT || 3000, ()=> {
	console.log(`app is running on port {process.env.PORT}`);
})