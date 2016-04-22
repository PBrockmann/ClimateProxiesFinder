
<?php

//------------------------------------------------------
if(isset($_POST['files']) && !empty($_POST['files'])) {

     //$files1 = array('img/marker_Ocea*.png', 'img/marker_Tree.png');
     
     $files = array();
     foreach ($_POST['files'] as $file) {
     //foreach ($files1 as $file) {
     	$files = array_merge($files, glob($file));
     }

     header('Content-Description: File download');
     header('Content-Type: application/zip');
     header('Content-disposition: attachment; filename="myZip.zip"');
     header('Pragma: no-cache'); 
     header('Expires: 0'); 
     
     //Opening a zip stream
     $files = implode(" ", $files);
     if ($files){
     	$fp = popen('zip -r -0 - ' . $files, 'r');
     }
     
     flush(); //Flushing the butter, pre streaming
     while(!feof($fp)) {
        	echo fread($fp, 8192);
     }
     //Closing the stream
     if ($files){ 
     	pclose($fp);
     }


}


//------------------------------------------------------
?>
