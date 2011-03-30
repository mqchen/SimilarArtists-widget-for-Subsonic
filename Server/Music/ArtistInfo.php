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
	
	/// Config
	protected $adapter = 'curl';
	
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
	
	protected function getHTTPRequester() {
		$r = new HTTP_Request2();
		$r->setAdapter($this->adapter);
		return $r;
	}
	
	protected function getArtistInfoFromName($name) {
		$req = $this->getHTTPRequester();
		$req->setUrl('http://musicbrainz.org/ws/1/artist/?type=xml&name='.urlencode($name));
		$req->setMethod(HTTP_Request2::METHOD_GET);
		$req->setConfig(array(
			'follow_redirects' => true
		));
		
		try {
			$xml = simplexml_load_string($req->send()->getBody());
		}
		catch(Exception $e) {
			throw new Exception('Fetching data from MusicBrainz failed: ' . $e->getMessage());
		}
		
		if($xml === false) {
			throw new Exception('Could not get info from Musicbrainz using name. Error: ' . implode("\n", libxml_get_errors()));
		}
		$this->getInfoFromXML($xml);
	}
	
	protected function getArtistInfoFromMusicBrainzId($id) {
		$req = $this->getHTTPRequester();
		$req->setUrl('http://musicbrainz.org/ws/1/artist/'.$id.'?type=xml');
		$req->setMethod(HTTP_Request2::METHOD_GET);
		$req->setConfig(array(
			'follow_redirects' => true
		));
		
		try {
			$xml = simplexml_load_string($req->send()->getBody());
		}
		catch(Exception $e) {
			throw new Exception('Fetching data from MusicBrainz using ID failed: ' . $e->getMessage());
		}
		
		if($xml === false) {
			throw new Exception('Could not get info from Musicbrainz. Error: ' . implode("\n", libxml_get_errors()));
		}
		$this->getInfoFromXML($xml);
	}
	
	protected function getSimilarArtists($limit) {
		// Last.fm
		$req = $this->getHTTPRequester();
		$req->setUrl('http://ws.audioscrobbler.com/2.0/artist/'.urlencode($this->name).'/similar.txt');
		$req->setMethod(HTTP_Request2::METHOD_GET);
		$req->setConfig(array(
			'follow_redirects' => true
		));
		
		try {
			$data = explode("\n", $req->send()->getBody());
		}
		catch(Exception $e) {
			throw new Exception('Requesting info from Last.fm failed: ' . $e->getMessage());
		}
		
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