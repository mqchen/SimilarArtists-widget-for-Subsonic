<?php

require_once 'Music/ArtistInfo.php';

$json = $_GET['callback'].'(';
try {
	
	if(!isset($_GET['name']) && !isset($_GET['id'])) {
		throw new Exception('Must specify either artist name or MusicBrainz id.');
	}
	
	$json .= json_encode(array('data' => get_object_vars(
		Music_ArtistInfo::factory(
			isset($_GET['name']) ? $_GET['name'] : $_GET['id'],
			isset($_GET['limit']) ? $_GET['limit'] : -1))
		));
}
catch(Exception $e) {
	$json .= json_encode(array('error' => $e->getMessage()));
}
$json .= ');';

echo $json;