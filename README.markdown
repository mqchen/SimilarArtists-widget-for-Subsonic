## About

This "mod" adds a small list to your default subsonic web interface with suggested artists fetched
from Last.fm.

The reason it uses PHP on the server-side to look up similar artists is because it was easier to
develop and easier to set up as it doesn't require the user to re-compile subsonic.

I will attempt to run the PHP script on my university's server as long as I can, but if you can, it
would be nice if you could set up your own.

## INSTALL

1. Open the file: `Client/scripts.js` 
2. Add everything under `/// Add similar artists` to your 
   `/var/subsonic/jetty/<num>/webapp/script/scripts.js` file
3. Put the `Client/similar_artists` directory from this package in `/var/subsonic/jetty/<num>/webapp/script/`.
   (The result should be `/var/subsonic/jetty/<num>/webapp/script/similar_artists/`)

*Optional*: If you'd like to setup your own similar artists server

1. Upload `Server` from this package to any webserver running PHP5.
2. Open `similar_artists/similar_artists.js` and change the `url` var to point to your server.

## Known limitations

- It only works with the themes shipped with Subsonic.

## License: MIT

Copyright (c) 2011 Newzoo Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.