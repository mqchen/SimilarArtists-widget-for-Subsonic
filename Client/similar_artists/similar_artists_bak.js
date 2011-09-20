$.noConflict();



jQuery(document).ready(function($) {
//(function($) {

    function parseCSV (csvString) {
        var fieldEndMarker  = /([,\015\012] *)/g; /* Comma is assumed as field separator */
        var qFieldEndMarker = /("")*"([,\015\012] *)/g; /* Double quotes are assumed as the quote character */
        var startIndex = 0;
        var records = [], currentRecord = [];
        do {
            // If the to-be-matched substring starts with a double-quote, use the qFieldMarker regex, otherwise use fieldMarker.
            var endMarkerRE = (csvString.charAt (startIndex) == '"')  ? qFieldEndMarker : fieldEndMarker;
            endMarkerRE.lastIndex = startIndex;
            var matchArray = endMarkerRE.exec (csvString);
            if (!matchArray || !matchArray.length) {
                break;
            }
            var endIndex = endMarkerRE.lastIndex - matchArray[matchArray.length-1].length;
            var match = csvString.substring (startIndex, endIndex);
            if (match.charAt(0) == '"') { // The matching field starts with a quoting character, so remove the quotes
                match = match.substring (1, match.length-1).replace (/""/g, '"');
            }
            currentRecord.push (match);
            var marker = matchArray[0];
            if (marker.indexOf (',') < 0) { // Field ends with newline, not comma
                records.push (currentRecord);
                currentRecord = [];
            }
            startIndex = endMarkerRE.lastIndex;
        } while (true);
        if (startIndex < csvString.length) { // Maybe something left over?
            var remaining = csvString.substring (startIndex).trim();
            if (remaining) currentRecord.push (remaining);
        }
        if (currentRecord.length > 0) { // Account for the last record
            records.push (currentRecord);
        }
        return records;
    }

    // Accepts a url and a callback function to run.
    function requestCrossDomain(url, callback, type) {
    	if(type === undefined) {
    		type = 'html';
    	}
        if(!url) {
            throw new Error('Must supply URL');
            return false;
        }
        
        // yql
        var method = jsonpMethods[attempts % jsonpMethods.length];
        if(debug) { console.debug('Using jsonp proxy: ' + method); }
        
        if(method === 'jania.pe.kr') { // dont think this proxy is very reliable
        	$.ajax({
        		'url' : 'http://jania.pe.kr/u/jsonp.cgi?url='+encodeURIComponent(url)+'&callback=?',
        		'dataType' : 'jsonp',
        		'success' : function(data) {
        			console.debug(data);
        		}
        	});
        }
        else {
			$.ajax({
				'url' : 'http://query.yahooapis.com/v1/public/yql?q=' +
					'SELECT * FROM '+type+' WHERE url="'+url,
				'dataType' : 'jsonp',
				'jsonp' : 'callback',
				'jsonpCallback' : '__similarArtistsCallback'
			});
        }
        
		function __similarArtistsCallback(data) {
			console.debug(data);
			if(method === 'jania.pe.kr') {
				console.debug(data);
			}
			else { // yql
				if(typeof(callback) === 'function' && data.results[0]) {
					data = data.results[0].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
					callback(data);
				}
				else {
					throw new Error('Given callback not a function or empty response.');
				}
				return true;
			}
		}
    }
    
    
    ////// Get similar artists
    var debug = true && console && console.debug;
    var retry = 60*60;
    var attempts = 0;
    var jsonpMethods = ['yql'/*,'jania.pe.kr'*/];

	var lastArtists = null;

	setInterval(function() {
		var curArtists = $('#nowPlaying .detail em');
		var playingArtists = []; var k = 0;
		for(var i = 0; i < curArtists.length; i++) {
			playingArtists[k++] = $(curArtists[i]).text();
		}
		if(playingArtists.length == 0) return;
//        console.debug(lastArtists + "\t" + playingArtists.join(','));
		if(lastArtists !== playingArtists.join(',')) {
			//console.debug(playingArtists);
			lastArtists = playingArtists.join(',');
			resetSimilarArtists();
			for(var i = 0; i < playingArtists.length; i++) {
				var curArtist = playingArtists[i];
				if(debug) {
					console.debug('Currently playing: ' + curArtist);
				}
				fetchSimilarArtists(curArtist);
			}
		}
	}, 1000);
	
	
	var fetchSimilarArtists = function(artist) {
		var artistName = null;
		var res = requestCrossDomain('http://musicbrainz.org/ws/1/artist/?name='+artist+'&type=xml&l=f',
		function(xml) {
			artistName = $($(xml).find('artist-list > artist:first-child > name')).text();
			if(artistName != null) {
				if(debug) { console.debug('Actual name: ' + artistName); }
				// get related arstist from last.fm
				var res = requestCrossDomain('http://ws.audioscrobbler.com/2.0/artist/'+
					encodeURIComponent(artistName)+'/similar.txt',
				function(data) {
					// strip html
					var el = $('<div style="display:none">'+data+'</div>');
					$('body').append(el);
					data = el.text();
					el.remove();
					
					data = parseCSV(data);
					var artists = [];
					var k = 0;
					for(var i = 0; i < data.length && artists.length < 30; i++) {
						var row = data[i];
						if(row.length >= 3 && row[2] !== '') {
							artists[k++] = row[2];
							
							// maybe fix last row YQL bug
							var fc = row[0].charAt(0);
							if(k > 1 && i > 0 && data[i] >= 3 && fc !== '1' || fc !== '0') {
								// Bug here..
								//var lastArtistNameSuffix = row[0].replace(/^(.*) [0|1](\.[0-9]+)?$/, '');
								var lastArtistNameSuffix = row[0].substr(0, row[0].lastIndexOf(' '));
								artists[k-2] += ' ' + lastArtistNameSuffix;
								
								// probably bug on this line too
								artists[k-1] = artists[k-1].replace(/^(.*) [0|1](\.[0-9]+)?$/, '$1');
								
								if(data[i].length >= 4) {
									artists[k++] = row[4];
								}
							}
						}
					}
					
					if(debug) {
						for(var i = 0; i < artists.length; i++) {
							console.debug('Similar artist: '+ artists[i]);
						}
					}
					
					injectSimilarArtists(artist, artists);
				},
				'html');
				
				if(!res && debug) {
					console.debug('Failed to get similar artists from Last.fm - proxy or service did not respond.');
				}
			}
		}, 'xml');
		
		if(!res && retry) {
			// try again with delay
			var currentLastArtists = lastArtists;
			setTimeout(function(s) {
				if(s === lastArtists) {
					lastArtists = null;
					attempts++;
					if(debug) { console.debug('Retrying...'); }
				}
				else {
					if(debug) { console.debug('Aborting retry, artist changed'); }
				}
			}, retry * 1000, currentLastArtists);
			if(debug) {
				setTimeout(function() {
					console.debug('Retrying in '+retry+' sec');
				}, 100);
			}
		}
		
		if(!res && debug) {
			console.debug('Failed to verify artist name using MusicBrainz - proxy or service did not respond.');
		}
	};
	
	/// Fetch info about new artist (BBC) - BBC's database isnt that good...
	var fetchSimilarArtistsBBC = function(artist) {
		// Get the mbz_guid from music brains
		var id = null;
		requestCrossDomain('http://musicbrainz.org/ws/1/artist/?type=xml&name='+encodeURIComponent(artist), 'xml',
		function(xml) {
			id = $($(xml).find('artist-list > artist:first-child')).attr('id');

			if(id !== null) {
				// get related artists from bbc
				$.ajax({
					'method' : 'GET',
					'dataType' : 'jsonp',
					'url' : 'http://www.bbc.co.uk/music/artists/'+id+'.jsonp',
					'success' : function(json) {
						var related = [];
						for(var i = 0; i < json.artist.related_artists.length; i++) {
							related[i] = json.artist.related_artists[i].artist.name;
						}
						injectSimilarArtists(artist, related);
					}
				});
			}
		});
		
	};
	
	/// Clear injected info
	var resetSimilarArtists = function() {
		if($('#similarArtists').length > 0) {
			$('#similarArtists').remove();
		}
		$('#nowPlaying').after('<div id="similarArtists"></div>');
		
		// Form, exists?
		if($('#similarArtistsSearch').length == 0) {
			$('#similarArtists').append(
				'<div style="display:none">'+
					'<form target="main" action="search.view" method="post">'+
						'<input type="text" name="query" />'+
					'</form>'+
				'</div>');
		}
	};
	
	/// Inject info
	var injectSimilarArtists = function(artist, artists) {
		
		// inject
		$('#similarArtists').append(
			//'<div id="similarArtists" data-artists="'+lastArtists+'">'+
				'<h2>Similar Artists for<br /><em>'+artist+'</em></h2>'
				//'<ul style="max-height:200px;overflow:auto;"></ul>'
			//'</div>'
		);
		var ul = $('<ul style="max-height:200px;overflow:auto;margin-left:0px;"></ul>');
		$('#similarArtists').append(ul);

		for(var i = 0; i < artists.length; i++) {
			var item = $('<li><a href="#">'+artists[i]+'</a></li>');
			item.click(function(e) {
				e.preventDefault();
				$('#similarArtists input[type=text]').val($(this).text());
				$('#similarArtists form').submit();
			});
			ul.append(item);
		}
	};
});  
//})(jQuery);
