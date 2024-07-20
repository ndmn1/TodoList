import express from 'express';
import reload from 'reload';
import bodyParser from 'body-parser';
import pg from 'pg';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import flash from 'express-flash';
const app = express();
const port = 3000;

const db = new pg.Client({ //ket noi toi database
    user: 'postgres',
    host: 'localhost',
    database: 'TodoApp',
    password: 'khater111',
    port: 5432,
});
db.connect();

app.use(  //su dung session
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000*60*60*24,
        //    secure: false,
         },
    })
)
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

const loginError='Sai tên đăng nhập hoặc mật khẩu';
const registerError='Tên đăng nhập đã tồn tại';
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(port, (err)=>
{
    if(err)
    {
        console.log("Error in starting server");
    }
    else
    {
        console.log("Server started on port 3000");
    }
});


app.get("/login",checkNoAuthenticated, (req, res) => {
    res.render("login.ejs");
  });
app.get("/register",checkNoAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get('/', checkAuthenticated,async (req, res) => {
    try{
       //  console.log('-------------------');
      // console.log(req.user);
        const data = await db.query('Select * from todolist where completed =0 and user_id = $1', [req.user.id]);
        data.rows.sort((a, b) => b.id - a.id);
        data.rows.forEach(element => {
            if(element.due) {
                // Convert to local time zone without changing the date
                const userTimezoneOffset = element.due.getTimezoneOffset() * 60000;
                const localDate = new Date(element.due.getTime() - userTimezoneOffset);
                element.due = localDate.toISOString().slice(0, 10);
            }
        });
        // console.log(data.rows);
        res.render("home.ejs",{tasks: data.rows});
      //  console.log('-------------------');
    }
    catch(err)
    {
        console.log(err);
    }
});

app.get('/logout',checkAuthenticated, function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
app.get('/newnote', function(req, res,next) {
    res.render("note.ejs");
    
});
app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/login",
      failureFlash: true
    })
);

app.post('/register', async (req, res) => {
   // console.log(req.body);
    try{
        const user = await db.query('Select * from users where username = $1', [req.body.username]);
        if(user.rows.length > 0)
        {
            res.render("register.ejs", {message: registerError});
        }
        else
        {
            const data = db.query('INSERT INTO users (username, password) VALUES ($1, $2)', [req.body.username, req.body.password]);
            res.render("register.ejs", {message: 'User registered successfully'});
        }
        
    }
    catch(err)
    {
        console.log(err);
    }
    
});
app.post('/add', async (req, res) => {
   // console.log(req.body);
    try{
        // console.log('add');
        // console.log(req.user);
        const data = await db.query('INSERT INTO todolist (title, content,due,completed,user_id) VALUES ($1, $2,$3,$4,$5)', [req.body.title, req.body.content,(req.body.due==='')? null: req.body.due,0,req.user.id]);
      //  console.log(data);
        res.redirect('/');
    }
    catch(err)
    {
        console.log(err);
    }
});
app.post('/complete', async (req, res) => {
   // console.log(req.body);
    try{
        const data = db.query('update todolist set completed =1 where id = ($1)', [req.body.id]);
        res.redirect('/');
    }
    catch(err)
    {
        console.log(err);
    }
});

app.get('/completed',checkAuthenticated, async (req, res) => {
    try{
        const data = await db.query('Select * from todolist where completed =1 and user_id = $1', [req.user.id]);
        data.rows.sort((a, b) => b.id - a.id);
        data.rows.forEach(element => {
            if(element.due) {
                // Convert to local time zone without changing the date
                const userTimezoneOffset = element.due.getTimezoneOffset() * 60000;
                const localDate = new Date(element.due.getTime() - userTimezoneOffset);
                element.due = localDate.toISOString().slice(0, 10);
            }
        });
        res.render("home.ejs",{tasks: data.rows,
                                trash_bin: true
        });
    }
    catch(err)
    {
        console.log(err);
    }
});
app.post('/delete', async (req, res) => {
    // console.log(req.body);
     try{
         const data = db.query('delete from todolist where id = ($1)', [req.body.id]);
         res.redirect('/completed');
     }
     catch(err)
     {
         console.log(err);
     }
 });
app.get('/edit/:id',checkAuthenticated, async (req, res) => {
    try{
        const data = await db.query('Select * from todolist where id = $1', [req.params.id]);
        data.rows.forEach(element => {
            if(element.due) {
                // Convert to local time zone without changing the date
                const userTimezoneOffset = element.due.getTimezoneOffset() * 60000;
                const localDate = new Date(element.due.getTime() - userTimezoneOffset);
                // console.log(element.due);
                // console.log(element.due.getTimezoneOffset());
                // console.log(element.due.getTime())
                // console.log(userTimezoneOffset);
                // console.log(localDate);
                element.due = localDate.toISOString().slice(0, 10);
            }
        });
        res.render("note.ejs",{task: data.rows[0]});
    }
    catch(err)
    {
        console.log(err);
    }
});
app.post('/edit/:id', async (req, res) => {
    try{
        const data = await db.query('update todolist set title=$1,content=$2,due=$3 where id = $4', [req.body.title,req.body.content,(req.body.due==='')? null: req.body.due,req.params.id]);
        res.redirect('/');
    }
    catch(err)
    {
        console.log(err);
    }
});
passport.use(
    'local',
    new LocalStrategy( async (username, password, done) => {
        try{
            const user = await db.query('Select * from users where username = $1', [username]);
            if(user.rows.length > 0)
            { 
                if(user.rows[0].password === password)
                {
                    return done(null, user.rows[0]);
                }
                else{
                    return done(null, false,  { message: loginError });
                }
            }
            else
            {
                return done(null, false,  { message: loginError });
            }
            
        }
        catch(err)
        {
            return done(err);
        }
    }
));
passport.serializeUser((user, cb) => {
  //  console.log('serializeUser');
    return cb(null, user.id);
});
  
passport.deserializeUser(async (id, cb) => {
   // console.log('deserializeUser');
    const user = await db.query('Select * from users where id = $1', [id]);
    return cb(null, user.rows[0]);
});

//db.end();
reload(app);

function checkAuthenticated(req, res, next){
    if(req.isAuthenticated())
    {
        return next();
    }
    else res.redirect('/login');
};
function checkNoAuthenticated(req, res, next){
    if(req.isAuthenticated())
    {
        res.redirect('/');
    }
    else return next();
};