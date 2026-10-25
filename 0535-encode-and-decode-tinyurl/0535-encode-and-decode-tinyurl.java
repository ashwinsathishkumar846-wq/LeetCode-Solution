import java.util.HashMap;
public class Codec {
    HashMap<String, String> map = new HashMap<>();
    int count = 0;
    public String encode(String longUrl) {
        String shortUrl = "http://ashwinurl.com/" + count;
        map.put(shortUrl, longUrl);
        count++;
        return shortUrl;
    }
    public String decode(String shortUrl) {
        return map.get(shortUrl);
    }
}