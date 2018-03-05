# What is this for?

It automatically updates a namecheap.com domain's A record to your network's actual external IP. This is useful for running a home server on an internet connection with a dynamic IP (i.e., running a server from your closet). Because namecheap's API has steep requirements to use, and their alternate method for dynamically updating an A zone messes up your TTL, I used browser automation (via Chrome Headless and Puppeteer) to just log in and change the DNS in the control panel. If namecheap changes their CSS selectors, then this won't work, but this program will fallback to namecheap's [recommended solution for changing DNS][1] (which has the side effect of changing TTL to Automatic—the whole purpose of using this program instead).

# Dependencies

- node.js
- yarn (or npm)
- POSIX

# Example usage

Setup:

```bash
git clone https://github.com/zerodeltasafe/namecheap-dns-changer
cd namecheap-dns-changer
yarn install
chmod a+x run.sh
```

![First step: Navigate to the Advanced DNS tab on namecheap](https://i.imgur.com/EIeMqVl.jpg)

![Second step: Turn on Dynamic DNS](https://i.imgur.com/toq8v2D.jpg)

![Third step: Set initial values for the A record](https://i.imgur.com/hmNAhfn.jpg)


Follow the instructions in the screenshots. You should initially set the IP to something that's not your actual IP just to ensure the program is working on the initial run. Then execute `./run.sh` with some variables set first. You could set this up as a systemd service so that it can run on boot.

```bash
# Set a bunch of variables
# (In a systemd unit file, environment variables can't be inline like here.)
# NAMECHEAP_USERNAME is your namecheap.com login username
# NAMECHEAP_PASSWORD your namecheap.com login password (remember to escape properly for bash)
# NAMECHEAP_DOMAIN is your root domain name, e.g., example.com
# NAMECHEAP_HOST is the host/name for the A record ("subdomain"); e.g., for my.example.com, "my" should be the value of this var
# NAMECHEAP_DDNS_PASSWORD is a token you get from namecheap's Advanced DNS tab by switching on "dynamic DNS"

NAMECHEAP_USERNAME=my_namecheap_username NAMECHEAP_PASSWORD=************** NAMECHEAP_DOMAIN=example.com NAMECHEAP_HOST=my NAMECHEAP_DDNS_PASSWORD=9a16830f06be49d09d02bd61896acdb9 ./run.sh
```

# License

GPL v3

"namecheap" is obviously namecheap.com which neither I nor this project is affiliated with


 [1]: https://www.namecheap.com/support/knowledgebase/article.aspx/29/11/how-to-use-the-browser-to-dynamically-update-hosts-ip
