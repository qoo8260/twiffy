var express = require('express');
var socket = require('socket.io');
var Twitter = require('twitter');
var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var analysisRouter = require('./routes/pastsearches');


//set up
const port = 3000;
var app = express();
var server = app.listen(port, function(){
    console.log('http://localhost:%s',port);
});

// Static files

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/pastsearches', analysisRouter);



//var countConnections=[];
var MultipleClients=[];
var io = socket(server);
io.on('connection', (socket) => {

        console.log('Socket Connection with Socket id: ', socket.id);
        //countConnections.push(socket.id);


        socket.on('searchTerm', function (searchKeyword) {


        console.log("Search Keyword: "+searchKeyword);

        try {


            var client = new Twitter({
                consumer_key: '5vbUTzXAsGrNkr34HDjpRN7PI',
                consumer_secret: 'DQNDG7Z5AG1D74mFwPZDwDLLYSGmQVD7ta4wK0GENLWKiqrm1K',
                access_token_key: '1043718081892118529-ZgCWOTX8OvnoMPWbkKrfj4QXQTckwY',
                access_token_secret: '8TUGFRgc9mHNy9edbSsatWJPnsfjHP1UY0eXw4vJRLOkX'
            });

                var clientElements={
                    socketId: socket.id,
                    searchTerm: searchKeyword,
                };
                MultipleClients.push(clientElements);




            client.stream('statuses/filter', {track: searchKeyword, language:'en'}, function(stream) {
                stream.on('error', function(err) {
                    console.log("Twitter API Limit Exceeded: "+err);
                });
                stream.on('data', function(tweet) {

                    //insert only once
                    var MinimumNoDuplication=0;
                    for(let i=0;i<MultipleClients.length;i++)
                    {
                        if(typeof(MultipleClients[i].socketId) === 'undefined')
                        {
                            console.log("socket id is not valid");
                        }
                        else if(MultipleClients[i].searchTerm === searchKeyword)
                        {
                            MinimumNoDuplication=i;
                            break;
                        }
                    }
                    //console.log(MinimumNoDuplication);
                    if(typeof(tweet)  !== 'undefined' && tweet.text && MultipleClients[MinimumNoDuplication].socketId === socket.id)
                    {
                        /*
                        var TweetElements = {
                            'text' : tweet.text
                        };
                        TweetsJSON.push(TweetElements);
                        */
                        //io.sockets.emit('getTweet', { message: tweet });

                        //push it to database
                        var tweetString=tweet.text;
                        console.log(tweetString);
                        socket.emit('getTweet', { tweetMessage: tweetString });
                    }
                    else
                    {
                        console.log("it may be duplicated, so it may not be added: "+tweet.text);
                    }


                });

                //========================================================================Disconnected
                socket.on('disconnect', function() {

                    for(let i=0;i<MultipleClients.length;i++)
                    {
                        if(typeof(MultipleClients[i].socketId) === 'undefined')
                        {
                            console.log("socket id is not valid");
                        }
                        else if(MultipleClients[i].socketId === socket.id)
                        {
                            MultipleClients.splice(i,1);
                            console.log("socket id: "+socket.id+" disconnected");
                        }



                    }


                    //console.log(MultipleClients);


                    console.log("socket id: "+socket.id+" disconnected");
                    stream.destroy();
                    console.log('Disconnected');

                });





            });
            }
        catch(err)
        {
            console.log("Twitter API Limit Exceeded: "+err);
        }









    });//searchTerm Socket




    //io.sockets.emit('chat', { message: tweet_text });





});//Main Socket

app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
