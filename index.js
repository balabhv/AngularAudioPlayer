var express = require('express');
var path = require('path');
var logger = require('morgan');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var dotenv = require('dotenv');
var AWS = require('aws-sdk');
var fs = require('fs');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var massive = require('massive');


// Load environment variables from .env file
dotenv.load();

var app = express();

var s3 = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY,
	secretAccessKey: process.env.AWS_SECRET_KEY
});

var dbURL = process.env.DATABASE_URL;

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

var db = massive.connectSync({
    connectionString: dbURL
});

app.get('/', function(request, response) {
	response.render('index');
});

app.get('/users/exists', function(request, response) {
    var screenName = (request.query.screenName == null) ? '' : request.query.screenName;
    var name = (request.query.name == null) ? '' : request.query.name;
    var email = (request.query.email == null) ? '' : request.query.email;
    var mobile = (request.query.mobile == null) ? '' : request.query.mobile;
    var fname = name.substring(0, name.indexOf(' '));
    var lname = name.substring(name.indexOf(' ') + 1);
    var query = 'SELECT * FROM users WHERE scrn_nm = $1 OR email_id = $2 OR mobile_no = $3 OR (first_nm = $4 AND last_nm = $5)';
    db.run(query, [screenName, email, mobile, fname, lname], function(err, result) {
        if (err) {
            response.send(JSON.stringify({
                success: false,
                response: 'Operation failed'
            }));
        } else {
            if (result.length > 0) {
                response.send(JSON.stringify({
                    success: true,
                    response: 'Operation succeeded'
                }));
            } else {
                response.send(JSON.stringify({
                    success: false,
                    response: 'Operation failed'
                }));
            }
        }
    });
});

app.get('/users/forgot/pass', function(request, response) {
    response.render('forgot_pass_1');
});

app.get('/users/:username/forgot/pass/security', function(request, response) {
    var screenName = request.params.username;
    var currentUser = db.users.findOneSync({scrn_nm: screenName});
    var questions = db.user_sec_ques.findSync({user_id: currentUser.user_id});
    var id = questions[0].sec_ques_id;
    var question = db.sec_ques_ref.findSync({sec_ques_id: id});
    response.render('forgot_pass_2', {
        username: screenName,
        question: question.ques_dsc
    });
});

app.post('/users/:username/forgot/pass/security', function(request, response) {
    var screenName = request.params.username;
    var currentUser = db.users.findOneSync({scrn_nm: screenName});
    var question = request.body.question;
    var answer = request.body.answer;
    var questionRef = db.sec_ques_ref.findSync({ques_dsc: question});
    var correctAnswer = db.user_sec_ques.findOneSync({user_id: currentUser.user_id, sec_ques_id: questionRef.sec_ques_id});
    if (correctAnswer.answer_txt.toLowerCase() == answer.toLowerCase()) {
        response.status(200);
    } else {
        response.status(500);
    }
});

app.get('/users/:username/forgot/pass/reset', function(request, response) {
    var screenName = request.params.username;
    response.render('forgot_pass_3', {
        username: screenName
    });
});

app.post('/users/:username/forgot/pass/reset', function(request, response) {
    var screenName = request.params.username;
    var pass1 = request.body.pass1;
    var pass2 = request.body.pass2;
    if (pass1 != pass2) {
        response.status(500);
    } else {
        var currentUser = db.users.findOneSync({scrn_nm: screenName});
        db.users.saveSync({user_id: currentUser.user_id, pass_wd: pass1});
        response.status(200);
    }
});

app.get('/users/forgot/username', function(request, response) {
    response.render('forgot_user_1');
});

app.post('/users/forgot/username', function(request, response) {
    var email = request.body.email;
    var user = db.users.findOneSync({email_id: email});
    sendEmail('admin@mydailybeat.com', email, 
        "Do Not Reply: Reset Your Username", 
        "Continue with the process of resetting your username by going to the following link:\n\n"
        + "http://www.mydailybeat.com/users/forgot/username/security/" + user.verif_cd, function (error, success) {
            if (error) {
                console.error(error);
            }
        });
});

app.get('/users/forgot/username/security/:code', function(request, response) {
    var code = request.params.code;
    var currentUser = db.users.findOneSync({verif_cd: code});
    var questions = db.user_sec_ques.findSync({user_id: currentUser.user_id});
    var id = questions[0].sec_ques_id;
    var question = db.sec_ques_ref.findSync({sec_ques_id: id});
    response.render('forgot_user_2', {
        hash: code,
        question: question.ques_dsc
    });

});

app.get('/register/security/:code', function(request, response) {
    var code = request.params.code;
    var currentUser = db.users.findOneSync({verif_cd: code});
    var questions = db.runSync('select * from sec_ques_ref');
    response.render('sec_ques_create', {
        user_id: currentUser.user_id,
        questions: questions
    });
});

app.post('/register/security', function(request, response) {
    var currentUser = db.users.findOneSync({user_id: request.body.user_id});
    var questions = request.body.questions;
    for (var i = 0 ; i < questions.length ; i++) {
        var question = questions[i];
        db.user_sec_ques.saveSync({user_id: currentUser.user_id, sec_ques_id: question.id, answer_txt: question.answer});
    }
    response.status(200);

});

app.post('/users/forgot/username/security/:code', function(request, response) {
    var code = request.params.code;
    var currentUser = db.users.findOneSync({verif_cd: code});
    var question = request.body.question;
    var answer = request.body.answer;
    var questionRef = db.sec_ques_ref.findSync({ques_dsc: question});
    var correctAnswer = db.user_sec_ques.findOneSync({user_id: currentUser.user_id, sec_ques_id: questionRef.sec_ques_id});
    if (correctAnswer.answer_txt.toLowerCase() == answer.toLowerCase()) {
        response.status(200);
    } else {
        response.status(500);
    }
});

app.get('/users/forgot/username/reset/:code', function(request, response) {
    var code = request.params.code;
    response.render('forgot_user_3', {
        hash: code
    });
});

app.post('/users/forgot/username/reset/:code', function(request, response) {
    var code = request.params.code;
    var currentUser = db.users.findOneSync({verif_cd: code});
    var username = request.body.username;
    var others = db.users.findSync({scrn_nm: username});
    if (others == null) {
        db.users.saveSync({user_id: currentUser.user_id, scrn_nm: username});
        response.status(200);
    } else if (others.count == 0) {
        db.users.saveSync({user_id: currentUser.user_id, scrn_nm: username});
        response.status(200);
    } else {
        response.status(500);
    }
});

app.post('/users/register', function(request, response) {
    var fname = request.body.fname;
    var lname = request.body.lname;
    var email = request.body.email;
    var screenName = request.body.screenName;
    var password = request.body.password;
    var mobile = request.body.mobile;
    var zipcode = request.body.zipcode;
    var birth_month = request.body.month;
    var birth_day = request.body.day;
    var birth_year = request.body.year;

    var verification_code = randomString(5, characterSet);

    var newUser = {
        first_nm: fname,
        last_nm: lname,
        email_id: email,
        mobile_no: mobile,
        scrn_nm: screenName,
        pass_wd: password,
        dob_mo: birth_month,
        dob_dy: birth_day,
        dob_yr: birth_year,
        zip_cd: zipcode,
        verif_cd: verification_code
    };

    console.log(newUser);

    db.users.save(newUser, function(err, result) {
        if (err) {
            response.status(500);
            console.error(err);
            response.send(JSON.stringify({response: err}));
        } else {
            response.send(JSON.stringify({
                id: result.user_id,
                fname: fname,
                lname: lname,
                email: email,
                mobile: mobile,
                screenName: screenName,
                password: password,
                birth_month: birth_month,
                birth_day: birth_day,
                birth_year: birth_year,
                zipcode: zipcode
            }));
        }
    });
    
});

app.post('/login', function(request, response) {

    var screenName = request.body.screenName;
    var password = request.body.password;

    db.users.findOne({scrn_nm: screenName, pass_wd: password}, function(err, user) {
        if(err) {
            response.status(500);
            response.send(JSON.stringify({response: err}));
            console.log(err);
        } else {
            db.users.saveSync({user_id: user.user_id, logged_in_yn: true});
            var retData = {
            	id: user.user_id,
            	fname: user.first_nm,
            	lname: user.last_nm,
            	email: user.email_id,
            	mobile: user.mobile_no,
            	screenName: screenName,
            	password: password,
            	birth_month: user.dob_mo,
            	birth_day: user.dob_dy,
            	birth_year: user.dob_yr,
            	zipcode: user.zip_cd
            };
            response.send(retData);
            
        }
    });
});

app.get('/user/:screenName/playlist', function(request, response) {
	var screenName = db.params.screenName;
	var user = db.users.findOneSync({scrn_nm: screenName});

	db.playlist.find({user_id: user.user_id}, function (err, resp) {
		if (err) {
			response.status(500);
			response.send(JSON.stringify({ success: false, message: err }));
		} else {
			response.send(resp);
		}
	});
});

app.post('/upload', multipartMiddleware, function(request, response, next) {
	var screenName = request.body.screenName;
	var password = request.body.password;

	var user = db.users.findOneSync({scrn_nm: screenName, pass_wd: password});
	if (bucketExists(screenName + "_bucket")) {
		fs.readFile(request.files.file.path, function (err, data) {
			if (err) {
				response.status(500);
				response.send(JSON.stringify({ success: false, message: err }));
			} else {
				uploadFile(user, data, request.files.file.originalFilename, screenName + "_bucket", response);
			}
		});
	} else {
		fs.readFile(request.files.file.path, function (err, data) {
			if (err) {
				response.status(500);
				response.send(JSON.stringify({ success: false, message: err }));
			} else {
				createBucket(screenName + "_bucket", response, function() {
					uploadFile(user, data, request.files.file.originalFilename, screenName + "_bucket", response);
				});
				
			}
		});
	}

});

function createBucket(name, response, callback) {
	var params = {
		Bucket: bucket
	};
	s3.createBucket(params, function(err, data) {
		if (err) {
			response.status(500);
			response.send(JSON.stringify({ success: false, message: uploadErr }));
		} else {
			console.log('Saved');
			callback();
		}
	});
}

function uploadFile(user, data, key, bucket, response) {
	var params = {
		Bucket: bucket,
		Key: key,
		Body: data
	};

	s3.putObject(params, function(uploadErr, data2) {
		if (uploadErr) {
			response.status(500);
			response.send(JSON.stringify({ success: false, message: uploadErr }));
		} else { 
			console.log('Saved');
			var url = 'https://'+ bucket + '.s3.amazonaws.com/' + key;
			var newEntry = db.playlist.saveSync({user_id: user.user_id, url: url});
			response.send(JSON.stringify({ success: true, message: 'Operation succeeded' }));
		}
	});
}

function bucketExists(name) {
	var params = {};
	s3.listBuckets(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
		} else {
			var buckets = data.Buckets;
			for (var i = 0 ; i < buckets.length ; i++) {
				if (buckets[i].Name == name) {
					return true;
				}
			}

			return false;
		}
	});
}


app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;