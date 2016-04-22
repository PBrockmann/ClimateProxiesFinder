
<?php

// http://coursesweb.net/php-mysql/create-zip-file-archive-php_cs
// https://github.com/ArturGrigio/php-Zip-Download-of-Large-Files-using-Buffer/blob/master/index.php

//------------------------------------------------------
function createZip($files, $zip_file) {
  $zip = new ZipArchive;
  if($zip->open($zip_file, ZipArchive::OVERWRITE) === TRUE) {
    foreach($files as $file){
      $zip->addFile($file);
    }
    $zip->close();
    return true;
  }
  else return false;
}

//------------------------------------------------------
  /* Example */

//if(isset($_POST['files']) && !empty($_POST['files'])) {

    $files1 = array('img/marker_*.png', 'img/marker_Tree.png');
    
    $files = array();
    //foreach ($_POST['files'] as $file) {
    foreach ($files1 as $file) {
    	$files = array_merge($files, glob($file));
    }
    
    //print_r($files);
    
    $zip_file = 'ClimateProxiesFinder_selection.zip';
    if(createZip($files, $zip_file)) {
    
          //header('Content-Description: File download');
          //header('Content-Type: application/zip');
          //header('Content-Disposition: attachment; filename="'.$zip_file.'"');
          ////header("Content-length: ".filesize($zip_file));		// not necessary
          //header('Pragma: no-cache'); 
          //header('Expires: 0'); 
          //readfile($zip_file);
          //unlink($zip_file);
          //exit;

          header('Content-Type: application/zip'); 
          header('Content-Disposition: attachment; filename="'.$zip_file.'"');

          ignore_user_abort(true);

          $context = stream_context_create();
          $file = fopen($zip_file, 'rb', FALSE, $context);
          while(!feof($file)) {
                   echo stream_get_contents($file, 2014);
          }
          fclose($file);
          flush();
          if (file_exists($zip_file)) {
                   unlink($zip_file);
          }

    
    }

//}


//------------------------------------------------------
?>
