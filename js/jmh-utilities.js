/*  File:  D:\H-Drive\91-461\461-2014-15f\assn09\MySolution\jmh-utilities.js
 *  Jesse M. Heines, UMass Lowell Computer Science, heines@cs.uml.edu
 *  Copyright (c) 2014 by Jesse M. Heines.  All rights reserved.  May be freely 
 *    copied or excerpted for educational purposes with credit to the author.
 *  updated by JMH on November 28, 2014 at 8:27 AM
 */


"use strict";  // to ensure that all variables are declared before use


// Sorting an array of JavaScript objects
// http://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects
// 
// Here's a more flexible version, which allows you to create 
// reusable sort functions, and sort by any field
// 
// added by JMH on May 24, 2013 at 2:35 PM
//
// documentation by JMH
// @param  field   name of field on which to sort
// @param  reverse true to sort in natural (typically ascending) order, false to reverse sort
// @param  primer  function to perform on field to sort before sorting [optional]
// @return a sort function that is passed to the built-in JavaScript sort function,
//            thereby essentially passing the sort function a comparison function
var sort_by = function (field, reverse, primer) {
    // pre-process the key to sort if desired
    var key = function (x) {
        return primer ? primer(x[field]) : x[field];
    };

    // set default sort order
    if (typeof (reverse) === "undefined") {
        reverse = true;
    }
    ;

    // return a function that extracts the two keys to compare and sort on and then
    //    defines the comparison function on those two keys
    return function (a, b) {
        // extract and preprocess (optional) the two keys
        var A = key(a),
                B = key(b);
        // the following is the comparison function, with three cases:
        //   (1) A < B returns -1 times the result of the reverse computation (below)
        //   (2) A > B returns +1 times the result of the reverse computation (below)
        //   (3) A = B returns  0 times the result of the reverse computation (below)
        // the reverse computation
        //   (1) defines an array containing -1 and +1
        //   (2) since reverse can be anything (it does not have to be a Boolean),
        //          !reverse makes it true if it is not defined and false if it is
        //   (3) but since this is the reverse of what we want, !!reverse switches it
        //          so that it is false if it is not defined and true if it is
        //   (4) the + sign converts true or false to +1 or 0, respectively
        //   (5) this result is used as an index into the [-1,+1] array to return
        //          -1 or +1 as required 
        return ((A < B) ? -1 : (A > B) ? +1 : 0) * [-1, 1][+!!reverse];
    };
};

