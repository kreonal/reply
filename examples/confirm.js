var reply = require('../index.js'); // requires reply source code in order to use its methods

//Asks user for confirmation
reply.confirm('Is that really what you want to do?', function (err, yes) {
    if (!err && yes) {
        console.log("Let's do it!");
    } else {
        console.log("Fine. Let's not do it :(");
    }
});