$.noConflict();

jQuery(document).ready(function($) {

    /**
     * Get similar artists config
     */
    var debug = true && console && console.debug;
    var retry = 5;
    var attempts = 0;
	var lastArtists = null;
	var url = 'http://moquanc.at.ifi.uio.no/ArtistInfo/jsonp.php';

	/**
	 * Add css
	 */
	$('<link />', {
		'type' : 'text/css',
		'rel' : 'stylesheet',
		'href' : '/script/similar_artists/similar_artists.css'
	}).appendTo('head');
	
	var escapeHTML = function(str) {
		var div = $('<div style="display:none" />');
		div.text(str);
		var html = div.html();
		div.remove();
		return html;
	};
	
	
	/**
	 * Monitor for artist changes
	 */
	setInterval(function() {
		var curArtists = $('#nowPlaying .detail em');
		var playingArtists = []; var k = 0;
		for(var i = 0; i < curArtists.length; i++) {
			playingArtists[k++] = $(curArtists[i]).text();
		}
		playingArtists = jQuery.unique(playingArtists);
		if(playingArtists.length == 0) return;
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
	
	/**
	 * Get similar artists from server
	 */
	var fetchSimilarArtists = function(artist) {
		$.ajax({
			'url' : url,
			'data' : {
				'name' : artist
			},
			'dataType' : 'jsonp',
//			'jsonp' : 'callback',
			'error' : function(jqXHR, msg) {
				var tmpArtist = lastArtists;
				if(debug) { 
					console.debug('Server failed to respond correctly: '+msg);
					console.debug('Retrying in ' + retry + ' sec');
				}
				setTimeout(function(s) {
					if(s === lastArtists) {
						lastArtists = null;
						if(debug) { console.debug('Retrying...'); }
					}
					else if(debug) {
						console.debug('Aborting retry, artist changed.');
					}
				}, retry * 1000, tmpArtist);
			},
			'success' : function(data, status, jqXHR) {
				if(data.error) {
					this.error(jqXHR, data.error);
				}
				else {
					if(debug) { console.debug(data.data); }
					injectSimilarArtists(data.data, data.data.similar);
				}
			}
		});
	};
	
	/**
	 * Clear the already injected info.
	 */
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
	
	/**
	 * Inject a list with similar artists
	 */
	var injectSimilarArtists = function(artist, artists) {
		
		// inject
		var desc = ((artist.type !== 'Unknown') ? '('+artist.type+') ' : '') + artist.disambiguation;
		$('#similarArtists').append(
			//'<div id="similarArtists" data-artists="'+lastArtists+'">'+
				'<h2 class="head">Similar Artists for</h2>'+
				'<a class="name" href="http://musicbrainz.org/search/textsearch.html?query='+encodeURIComponent(artist.name)+
				'&type=artist" target="_blank" title="'+escapeHTML(desc)+'">'+
				escapeHTML(artist.name)+'</a>'
				//'<ul style="max-height:200px;overflow:auto;"></ul>'
			//'</div>'
		);
		var ul = $('<ul class="similar"></ul>');
		$('#similarArtists').append(ul);
		
		var similarCount = 0;

		for(var i = 0; i < artists.length; i++) {
			if(jQuery.trim(artists[i]) === '') continue;
			similarCount++;
			var item = $('<li><a href="#">'+artists[i]+'</a></li>');
			item.click(function(e) {
				e.preventDefault();
				$('#similarArtists input[type=text]').val($(this).text());
				$('#similarArtists form').submit();
			});
			ul.append(item);
		}
		
		if(similarCount === 0) {
			ul.after('None');
			ul.remove();
		}
	};
});
