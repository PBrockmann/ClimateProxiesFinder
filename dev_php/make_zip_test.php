
<?php

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

if(isset($_POST['files']) && !empty($_POST['files'])) {

    $files = array();
    foreach ($_POST['files'] as $file) {
    	$files = array_merge($files, glob($file));
    }

    // for preventing directory traversal, allow only from a specific directory ie /var/www/html/ClimateProxiesFinder_DB
    $files_checked = array();
    foreach ($files as $file) {
	if (strpos(realpath($file), "/var/www/html/ClimateProxiesFinder_DB") !== false) {
		array_push($files_checked, $file);
	}
    }

    print_r($files);
    print_r($files_checked);

    //$zip_file = tempnam('/tmp', 'ClimateProxiesFinder_YourSelection_').'.zip'; 

    //if (createZip($files, $zip_file)) {
   
    //      header('Content-Description: File download');
    //      header('Content-Type: application/zip');
    //      header('Content-Disposition: attachment; filename="'.basename($zip_file).'"');
    //      header('Pragma: no-cache'); 
    //      header('Expires: 0'); 
    //      readfile($zip_file);
    //      unlink($zip_file);
    //      exit;
    //
    //}

}


//------------------------------------------------------
?>
