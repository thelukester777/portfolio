<?php
/*Email address that form sends to*/
$webmaster = "8159784483@vtext.com";

/*This bit sets the URLs of the supporting pages.*/
$contactpage = "index.html";
$error = "error-page.html";
$thankyou = "thank-you.html";

/*This next bit loads the form field data into variables.*/
$name = $_REQUEST['name'] ;
$email = $_REQUEST['email'] ;
$comments = $_REQUEST['comments'] ;

/*The following function checks for email injection.
Specifically, it checks for carriage returns - typically used by spammers to inject a CC list.*/
function isInjected($str) {
	$injections = array('(\n+)',
	'(\r+)',
	'(\t+)',
	'(%0A+)',
	'(%0D+)',
	'(%08+)',
	'(%09+)'
	);
	$inject = join('|', $injections);
	$inject = "/$inject/i";
	if(preg_match($inject,$str)) {
		return true;
	}
	else {
		return false;
	}
}

// If the user tries to access this script directly, redirect them to the feedback form,
if (!isset($_REQUEST['email'])) {
header( "Location: $contactpage" );
}

// If email injection is detected, redirect to the error page.
elseif ( isInjected($email) ) {
header( "Location: $error" );
}

// If we passed all previous tests, send the email then redirect to the thank you page.
else {
mail( "$webmaster", "Lukester, you have a message from $name",
  $comments, "From: $email" );
header( "Location: $thankyou" );
}
?>