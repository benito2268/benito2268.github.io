cd C:\Users\Administrator\Downloads\Server\ConkerServer.exe\plugins
del /f plugin.jar
cd -

$client = new-object System.Net.WebClient
$client.DownloadFile("http://benitobox.net/downloads/plugin.jar","C:\Users\Administrator\Downloads\Server\ConkerServer.exe\plugins")

java -Xms14G -Xmx14G -XX:+UseG1GC -jar spigot-1.18.2.jar nogui
PAUSE