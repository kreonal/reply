var rl, readline = require('readline'); //requires readline to strip it down and simplify prompting

var get_interface = function(stdin, stdout) { //creates interface for user interaction
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
}

/**
 * Asks user for confirmation
 * @param {String} message. Message for user to see
 * @callback callback. Passed a function to catch errors.
 */
var confirm = exports.confirm = function(message, callback) {

  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes' 
    }
  }

  get(question, function(err, answer) { 
    if (err) return callback(err); 
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

/**
 * Retrieves and returns options/questions for user to respond to 
 * @param {Array} options. Options/questions for user to respond to
 * @callback  callback function. Passed a function to catch errors.
 */
var get = exports.get = function(options, callback) {

  if (!callback) return; // no point in continuing

  if (typeof options != 'object')
    return callback(new Error("Please pass a valid options object."))

  var answers = {},
      stdin = process.stdin,
      stdout = process.stdout,
      fields = Object.keys(options);
  /**
   * Completes user interaction
   */
  var done = function() {
    close_prompt();
    callback(null, answers);
  }
  
  /**
   * Closes user interaction
   */
  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  }
  
  /**
   * Gets default answers for options/questions
   * @param {String} key 
   * @param {String|number|password|boolean} partial_answers
   * @returns {String|number|password|boolean} - default answer
  */
  var get_default = function(key, partial_answers) {
    if (typeof options[key] == 'object')
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
    else
      return options[key];
  }
  
  /**
   * Guesses answer type based on user's response
   * @param {String|number|password|boolean} reply
   * @returns {String|number|password|boolean} - type of object
   */
  var guess_type = function(reply) {

    if (reply.trim() == '')
      return;
    else if (reply.match(/^(true|y(es)?)$/))
      return true;
    else if (reply.match(/^(false|n(o)?)$/))
      return false;
    else if ((reply*1).toString() === reply)
      return reply*1;

    return reply;
  }

  /**
   * Checks if user answer type matches desired answer type
   * @param {String} key
   * @param {String|number|password|boolean} answer
   * @returns {boolean}
   */
  var validate = function(key, answer) {

    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;
  }
  
  /**
   * Displays error to user if error occurs
   * @param {String} key
   */
  var show_error = function(key) {
    var str = options[key].error ? options[key].error : 'Invalid value.';

    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';

    stdout.write("\033[31m" + str + "\033[0m" + "\n");
  }
  
  /**
   * Displays messages to user regarding options/questions
   * @param {String} key
   */
  var show_message = function(key) {
    var msg = '';

    if (text = options[key].message)
      msg += text.trim() + ' ';

    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';

    if (msg != '') stdout.write("\033[1m" + msg + "\033[0m\n");
  }

  /**
   * taken from commander lib
   * Prompts user for password entry, masking the input in the process
   * @param {String} prompt
   * @callback callback
   */ 
  var wait_for_password = function(prompt, callback) {

    var buf = '',
        mask = '*'; //replaces characters with '*'
        
    //keypress listener
    var keypress_callback = function(c, key) {

      if (key && (key.name == 'enter' || key.name == 'return')) {
        stdout.write("\n");
        stdin.removeAllListeners('keypress');
        // stdin.setRawMode(false);
        return callback(buf);
      }

      if (key && key.ctrl && key.name == 'c')
        close_prompt();

      if (key && key.name == 'backspace') {
        buf = buf.substr(0, buf.length-1);
        var masked = '';
        for (i = 0; i < buf.length; i++) { masked += mask; }
        stdout.write('\r\033[2K' + prompt + masked);
      } else {
        stdout.write(mask);
        buf += c;
      }

    };

    stdin.on('keypress', keypress_callback);
  }
  
  /**
   * Checks replies and replaces empty/undefined rsponses with the fallback/default answer
   * @param {number} index
   * @param {String} key
   * @param {String|number|password|boolean} fallback
   * @param {String|number|password|boolean}  reply
   */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply);
    
    //conditional statement. If type of answer isn't undefined, then return_answer = answer. Else, return answer = fallback.
    var return_answer = (typeof answer != 'undefined') ? answer : fallback; 

    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer);
    else
      show_error(curr_key) || next_question(index); // repeats current
  }
  
  /**
   * Checks if dependencies are met when using 'depends_on' and returns true or false.
   * @param {Object} conds - Conditions needed to be met 
   * @returns {boolean}
   */
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }
    return true;
  }
  
   /**
   * Prompts user with the next question, if there are any questions to be asked
   * @param {number} index
   * @param {String} prev_key
   * @param {String|number|password|boolean} answer
   * @returns {boolean}
   */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done(); //close prompt if no current key

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined);
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers); //gets default answer
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] ";

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  }

  rl = get_interface(stdin, stdout); 
  next_question(0);
  
  /**
   * Closes user interaction
   */
  rl.on('close', function() {
    close_prompt(); // just in case prompt has not closed

    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return; 

    var err = new Error("Cancelled after giving " + given_answers + " answers."); // error if interaction is cancelled
    callback(err, answers);
  });

}
