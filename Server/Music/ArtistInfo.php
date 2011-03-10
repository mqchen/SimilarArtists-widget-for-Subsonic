<?php


require_once 'HTTP/Request2.php';


if(!function_exists('str_getcsv')) {
	function str_getcsv($input, $delimiter=',', $enclosure='"', $escape=null, $eol=null) {
		$temp = fopen("php://memory", "rw");
		fwrite($temp, $input);
		fseek($temp, 0);
		$r = fgetcsv($temp, 4096, $delimiter, $enclosure);
		fclose($temp);
		return $r;
	}
}

class Music_ArtistInfo {
	
	public $name = '';
	public $musicBrainzId = '';
	public $type = 'Unknown';
	public $begin = null;
	public $end = null;
	public $disambiguation = '';
	public $similar = array();
	
	protected function __construct() {
	}
	
	protected function getInfoFromXML(SimpleXMLElement $xml) {
		$xml->registerXPathNamespace('mb', 'http://musicbrainz.org/ns/mmd-1.0#');
		$xml->registerXPathNamespace('ext', 'http://musicbrainz.org/ns/ext-1.0#');
		
		// artist
		$xpaths = array(
			"/mb:metadata/mb:artist-list/mb:artist[@type != 'Unknown']",
			'/mb:metadata/mb:artist[1]',
			'/mb:metadata/mb:artist-list/mb:artist[1]',
		);
		
		foreach($xpaths as $num => $xpath) {
			$artist = $xml->xpath($xpath);
			if($artist === false || count($artist) == 0) {
				if($num === count($xpaths) - 1) {
					throw new Exception('Could not get info from MusicBrainz.');
				}
			}
			else {
				break;
			}
		}
		
		$artist = $artist[0];
		
		// id
		$attr = $artist->attributes();
		$this->musicBrainzId = $attr['id'] . '';
		
		// type
		$this->type = $attr['type'] . '';
		
		// name
		$this->name = $artist->name . '';
		
		// disambiguation
		$this->disambiguation = $artist->disambiguation . '';
		
		// begin
		if($artist->{'life-span'}) {
			$tmp = $artist->{'life-span'}->attributes();
			$this->begin = $tmp['begin'] . '';
			if(array_key_exists('end', $tmp)) {
				$this->end = $tmp['end'] . '';
			}
		}
	}
	
	protected function getArtistInfoFromName($name) {
		$req = new HTTP_Request2('http://musicbrainz.org/ws/1/artist/?type=xml&name='.urlencode($name), HTTP_Request2::METHOD_GET);
		$req->setConfig(array(
			'follow_redirects' => true
		));
		
		$xml = simplexml_load_string($req->send()->getBody());
		$this->getInfoFromXML($xml);
	}
	
	protected function getArtistInfoFromMusicBrainzId($id) {
		$req = new HTTP_Request2('http://musicbrainz.org/ws/1/artist/'.$id.'?type=xml', HTTP_Request2::METHOD_GET);
		$req->setConfig(array(
			'follow_redirects' => true
		));
		
		$xml = simplexml_load_string($req->send()->getBody());
		$this->getInfoFromXML($xml);
	}
	
	protected function getSimilarArtists($limit) {
		// Last.fm
		$req = new HTTP_Request2('http://ws.audioscrobbler.com/2.0/artist/'.urlencode($this->name).'/similar.txt', HTTP_Request2::METHOD_GET);
		$req->setConfig(array(
			'follow_redirects' => true
		));
		
		$data = explode("\n", $req->send()->getBody());
		
		for($i = 0, $count = count($data); $i < $count && $i < $limit; $i++) {
			$row = str_getcsv($data[$i]);
			$this->similar[] = htmlspecialchars_decode($row[2]);
		}
	}
	
	public static function factory($artistOrMBID, $limit = 30) {
		if($limit < 0) { $limit = 30; }
		$a = new self();
		if(preg_match('/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/', $artistOrMBID)) {
			// Id
			$a->getArtistInfoFromMusicBrainzId($artistOrMBID);
		}
		else {
			// Name
			// Need to find ID
			$a->getArtistInfoFromName($artistOrMBID);
		}
		
		// similar artists
		$a->getSimilarArtists($limit);
		
		return $a;
	}
}