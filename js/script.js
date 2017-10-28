/*
 * This is the main player logic. Do NOT change the controller's business logic.
 * Only change the location of the json file containing the songs. The default value
 * is set to a preincluded JSON file.
 * 
 */

"use strict";  // to ensure that all variables are declared before use
var myApp = angular.module('PlayerApp', ['ngMaterial']);

// set a constant to the JSON file path
myApp.constant("jsonUrl", "json/songs.json");

// add business logic to the audio player controller
myApp.controller('PlayerCtrl',
        /** Read JSON data using Ajax - adapted from Pro AngularJS, p. 149.
         *  @param $scope  the standard AngularJS model scope
         *  @param $http   the built-in AngularJS http object containing the get function
         *  @param jsonUrl the app constant containing the JSON file path (defined above)
         */
                function ($scope, $http, jsonUrl) {
                    $scope.jsonData = {};              // initialize an object in the model's scope
                    $http.get(jsonUrl)                // perform the Ajax call
                            .success(function (data) {      // execute this function if the Ajax succeeds
                                $scope.jsonData.data = data;

                                //function to shuffle the input data randomly
                                $scope.shuffle = function (o) {
                                    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x)
                                        ;
                                    return o;
                                };

                                // shuffle the input and set the initial song
                                $scope.jsonData.data.RECORDS = $scope.shuffle($scope.jsonData.data.RECORDS);
                                $scope.currentSong = $scope.jsonData.data.RECORDS[0].src;
                                $scope.currentSongIndex = 0;
                                $scope.currentSongTitle = $scope.jsonData.data.RECORDS[0].title;

                            })
                            .error(function (error) {      // execute this function if the Ajax fails
                                $scope.jsonData.error = error; // set the model's jsonData.error property to the
                            });                             //    error returned by the Ajax call

                    $scope.audioContext = new AudioContext();
                    $scope.src = null;
                    $scope.analyser = null;

                    // default: don't loop the current song
                    $scope.loop = false;
                    
                    $scope.isNavOpen = false;


                    $scope.onPlay = function (audio) {
                        $scope.src = $scope.audioContext.createMediaElementSource(audio);
                        $scope.analyser = $scope.audioContext.createAnalyser();

                        var canvas = document.getElementById("visualizer");
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight / 2;
                        var ctx = canvas.getContext("2d");

                        $scope.src.connect($scope.analyser);
                        $scope.analyser.connect($scope.audioContext.destination);

                        $scope.analyser.fftSize = 256;

                        var bufferLength = $scope.analyser.frequencyBinCount;

                        var dataArray = new Uint8Array(bufferLength);

                        var WIDTH = canvas.width;
                        var HEIGHT = canvas.height;

                        var barWidth = (WIDTH / bufferLength) * 1.5;
                        var barHeight;
                        var x = 0;

                        function renderFrame() {
                            requestAnimationFrame(renderFrame);
                            x = 0;
                            $scope.analyser.getByteFrequencyData(dataArray);
                            ctx.fillStyle = "#FFF";
                            ctx.fillRect(0, 0, WIDTH, HEIGHT);
                            for (var i = 0; i < bufferLength; i++) {
                                barHeight = dataArray[i];
                                var r = barHeight + (25 * (i / bufferLength));
                                var g = 250 * (i / bufferLength);
                                var b = 50;
                                ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                                ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
                                x += barWidth + 1;
                            }
                        }

                        renderFrame();
                    };

                    // set a listener on the audio tag so that when one song ends,
                    // the next song in the playlist begins automatically.
                    // if loop is true, then the cursor is set to 0, and the
                    // player begins playing
                    angular.element(document).ready(function () {
                        var audio = document.getElementById('audioplayer');
                        audio.addEventListener('ended', function () {
                            if (!$scope.loop) {
                                $scope.nextSong();
                            } else {
                                this.currentTime = 0;
                                this.play();
                            }

                        });
                        audio.addEventListener('play', function () {
                            $scope.onPlay(this);
                        });
                    });

                    // boolean to make sure that the user double-clicks the previous button
                    // single click returns the cursor to the beginning of the song.
                    $scope.prevClicked = false;

                    // change song when a song is selected from the playlist.
                    $scope.changeSong = function (oneSubmit) {

                        var audio = document.getElementById('audioplayer');
                        audio.setAttribute('src', oneSubmit.src);

                        // get the current song
                        $scope.currentSong = oneSubmit.src;
                        for (var i = 0; i < $scope.jsonData.data.RECORDS.length; i++) {
                            var obj = $scope.jsonData.data.RECORDS[i];
                            if (obj.src === $scope.currentSong) {
                                $scope.currentSongIndex = i;
                                $scope.currentSongTitle = obj.title;
                                console.log('Current Title: ' + $scope.currentSongTitle);
                                break;
                            }
                        }

                        // shuffle the other songs in the list and move the current song to the top
                        var temparr = [];
                        for (var i = 0; i < $scope.jsonData.data.RECORDS.length; i++) {
                            if (i !== $scope.currentSongIndex) {
                                temparr[temparr.length] = $scope.jsonData.data.RECORDS[i];
                            }
                        }
                        temparr = $scope.shuffle(temparr);
                        $scope.jsonData.data.RECORDS[0] = $scope.jsonData.data.RECORDS[$scope.currentSongIndex];
                        for (var i = 1; i < $scope.jsonData.data.RECORDS.length; i++) {
                            $scope.jsonData.data.RECORDS[i] = temparr[i - 1];
                        }

                        $scope.currentSongIndex = 0;

                        audio.play();
                        $scope.closeNav();

                    };

                    // handle the click of the previous button
                    $scope.prevSong = function () {
                        // if playing the first song in the list
                        if ($scope.currentSongIndex === 0) {

                            // return to the beginning
                            var audio = document.getElementById('audioplayer');
                            audio.currentTime = 0;

                            audio.play();


                        } else {
                            if (!$scope.prevClicked) {
                                // if previous is clicked once
                                var audio = document.getElementById('audioplayer');
                                audio.currentTime = 0;
                                $scope.prevClicked = true;
                                window.setTimeout(function () {
                                    // if previous is not clicked again within 500 milliseconds,
                                    // set the boolean back to false
                                    $scope.prevClicked = false;
                                }, 500);
                            } else {
                                // load the previous song in the list.
                                $scope.prevClick = false;
                                $scope.currentSongIndex = $scope.currentSongIndex - 1;

                                var audio = document.getElementById('audioplayer');
                                audio.setAttribute('src', $scope.jsonData.data.RECORDS[$scope.currentSongIndex].src);
                                $scope.currentSong = $scope.jsonData.data.RECORDS[$scope.currentSongIndex].src;
                                $scope.currentSongTitle = $scope.jsonData.data.RECORDS[$scope.currentSongIndex].title;


                                audio.play();

                            }

                        }

                    };

                    // handle the click of the next button
                    $scope.nextSong = function () {
                        // if the current song is the last song in the playlist
                        if ($scope.currentSongIndex === $scope.jsonData.data.RECORDS.length - 1) {
                            // wrap around to the first song in the playlist
                            $scope.currentSongIndex = 0;

                            var audio = document.getElementById('audioplayer');
                            audio.setAttribute('src', $scope.jsonData.data.RECORDS[$scope.currentSongIndex].src);
                            $scope.currentSong = $scope.jsonData.data.RECORDS[$scope.currentSongIndex].src;
                            $scope.currentSongTitle = $scope.jsonData.data.RECORDS[$scope.currentSongIndex].title;

                            audio.play();

                        } else {
                            // move to the next song in the playlist
                            $scope.currentSongIndex = $scope.currentSongIndex + 1;

                            var audio = document.getElementById('audioplayer');
                            audio.setAttribute('src', $scope.jsonData.data.RECORDS[$scope.currentSongIndex].src);
                            $scope.currentSong = $scope.jsonData.data.RECORDS[$scope.currentSongIndex].src;
                            $scope.currentSongTitle = $scope.jsonData.data.RECORDS[$scope.currentSongIndex].title;
                            console.log('Current Title: ' + $scope.currentSongTitle);

                            audio.play();

                        }
                    };

                    $scope.openNav = function () {
                        document.getElementById("songs-list").style.width = "250px";
                        document.getElementById("main").style.marginRight = "250px";
                        $scope.isNavOpen = true;
                    };

                    $scope.closeNav = function () {
                        document.getElementById("songs-list").style.width = "0";
                        document.getElementById("main").style.marginRight = "0";
                        $scope.isNavOpen = false;
                    };
                    
                    $scope.toggleNav = function() {
                        if ($scope.isNavOpen) {
                            $scope.closeNav();
                        } else {
                            $scope.openNav();
                        }
                    };


                }
        );