const express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  uuid = require('uuid'),
  mongoose = require('mongoose'),
  Models = require('./models.js'),
  passport = require('passport'),
  cors = require('cors');

const { check, validationResult } = require('express-validator');

require('./auth');

const jwtSecret = 'your_jwt_secret'; //must be same key used in JWTStrategy in passport.js

const jwt = require('jsonwebtoken');

let generateJWTToken = (user) => {
    return jwt.sign(user, jwtSecret, {
        subject: user.Username, //username encoded in JWT
        expiresIn: '7d', //token expires in 7 days
        algorithm: 'HS256' //algorithm used to 'sign'/encode values of the JWT
    });
}

const Movies = Models.Movie,
  Users = Models.User;

// connect to MongoDB Atlas database
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();

app.use(morgan('common'));
app.use(bodyParser.json());
app.use(cors()); //allows requests from all origins

//return static files
app.use(express.static('public'));

//GET requests
//welcome message on homepage
app.get('/', (req, res) => {
  res.send('Welcome to myMusicalFlix!');
});

app.post('/login', (req, res) => {
  passport.authenticate('local', { session: false }, (error, user, info) => {
    if (error || !user) {
      return res.status(400).json({
        message: 'Something is not right',
        user: user
      });
    }
    req.login(user, { session: false }, (error) => {
      if (error) {
        res.send(error);
      }
      let token = generateJWTToken(user.toJSON());
      return res.json({ user, token });
    });
  })(req, res);
});

//gets list of all movies
app.get(
  '/movies',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.find()
      .then(movies => {
        res.json(movies);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//gets data about a specific movie by title
app.get(
  '/movies/:Title',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.Title })
      .then(movie => {
        res.json(movie);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//gets data about a specific genre by genre name
app.get(
  '/movies/genre/:Name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Genre.Name': req.params.Name })
      .then(movie => {
        res.json(movie.Genre);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//gets data about a specific genre; search by movie title
app.get(
  '/movies/:Title/genre',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.Title })
      .then(movie => {
        res.json(movie.Genre);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//gets data about a specific director by name
app.get(
  '/movies/directors/:Name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Directors.Name': req.params.Name })
      .then(movie => {
        let directorData = movie.Directors.find(
          ({ Name }) => Name === req.params.Name
        );
        res.json(directorData);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//gets data about a specific actor by name
app.get(
  '/movies/actors/:Name',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Movies.findOne({ 'Actors.Name': req.params.Name })
      .then(movie => {
        let actorData = movie.Actors.find(
          ({ Name }) => Name === req.params.Name
        );
        res.json(actorData);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//allows new user to register
app.post(
  '/users',
  //validation logic for request
  [
    check('Username', 'Username is required').not().isEmpty(),
    check('Username', 'Username must be at least 5 characters').isLength({
      min: 5,
    }),
    check(
      'Username',
      'Username can only contain letters or numbers'
    ).isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Password', 'Password must be at least 8 characters').isLength({
      min: 8,
    }),
    check('Email', 'Email does not appear to be valid').isEmail(),
  ],
  (req, res) => {
    //checks validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username })
      .then(user => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthdate: req.body.Birthdate,
          })
            .then(user => {
              res.status(201).json(user);
            })
            .catch(err => {
              console.error(err);
              res.status(500).send('Error: ' + err);
            });
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

// //gets data about a specific user account
// //needs separate JWT to ensure users only have access to their own account
// app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
//     Users.findOne({ Username: req.params.Username })
//         .then((user) => {
//             res.json(user);
//         })
//         .catch((err) => {
//             console.error(err);
//             res.status(500).send('Error: ' + err);
//         });
// });

//Allows user to update user info
app.put(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  //validation logic for request
  [
    check('Username', 'Username is required').not().isEmpty(),
    check('Username', 'Username must be at least 5 characters').isLength({
      min: 5,
    }),
    check(
      'Username',
      'Username can only contain letters or numbers'
    ).isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Password', 'Password must be at least 8 characters').isLength({
      min: 8,
    }),
    check('Email', 'Email does not appear to be valid').isEmail(),
  ],
  (req, res) => {
    //checks validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthdate: req.body.Birthdate,
        },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Allows user to add movie to list of favourites
app.post(
  '/users/:Username/Movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavouriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Allows user to remove movie from list of favourites
app.put(
  '/users/:Username/Movies/:MovieID',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: { FavouriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//Allows existing user to deregister
app.delete(
  '/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Users.findOneAndRemove({ Username: req.params.Username })
      .then(user => {
        if (!user) {
          res.status(400).send(req.params.Username + ' was not found');
        } else {
          res.status(200).send(req.params.Username + ' was deleted');
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  }
);

//error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke');
});

//listen for requests via environment variables
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
