var reply = require('../index.js');

var options = {
    name: {
        message : 'Please enter your name:',
        allow_empty: false // cannot be left empty by user
    },
    username: {
        message: 'Please enter your username:',
        default : 'nobody', // if user leaves answer empty, this is the default answer
        type    : 'string'    // value needs to be a number
    },
    email: {
        message: 'Please enter your e-mail: [username@domain.com]', 
        type    : 'string'   
    },
    gender: {
        options : ['Male', 'Female', 'Other']
    },
    password: {
        message : 'Please enter your password. Your password must have at least 8 characters:',
        type    : 'password', // indicates password type, masking input with '*'
        regex   : /(\w{8})/, // user's input must contain at least 8 characters
        error   : '8 characters are needed. Try another password'
    },
    age: {
        message : 'Please enter your age:',
        type    : 'number', // value needs to be a number
    }
};

//Gets options/questions and prompts user for answers
reply.get(options, function(err, answers) {
    console.log(answers);
    
    //Asks user for confirmation
    reply.confirm('Is this information correct?', function(err, yes) {
        if (!err && yes) {
            console.log('Thank you for registering!');    
        } else {
            console.log("Well, that's unfortunate");
        }    
    })
});
