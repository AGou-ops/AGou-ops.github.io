<html>
<head>
<meta charset="utf-8">
<title>no face</title>
</head>
<body>

<?php
function get_all_node($code){ 
    preg_match_all("/Fetching node data from url '(.*)'/i",$code,$arr); 
    return $arr[1]; 
}
if (!empty($_GET['type']) && '1'===$_GET['type']){
    echo nl2br(file_get_contents("nodes.txt"));
}else{
    $text = file_get_contents("result.txt");
    $ret = get_all_node($text);
    foreach ($ret as $value){
        echo $value."<br/>";
    } 
}

?>
</body>
</html>