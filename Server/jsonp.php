<?php

require_once 'Music/ArtistInfo.php';


$json = $_GET['callback'].'(';
try {
	$json .= json_encode(array('data' => get_object_vars(
		Music_ArtistInfo::factory(isset($_GET['name']) ? $_GET['name'] : $_GET['id']))));
}
catch(Exception $e) {
	$json .= json_encode(array('error' => $e->getMessage()));
}
$json .= ');';

echo $json;