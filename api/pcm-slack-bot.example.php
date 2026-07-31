<?php
/**
 * TEMPLATE - copy to pcm-slack-bot.php ON THE SERVER and fill in.
 *
 * pcm-slack-bot.php is gitignored (this repo is PUBLIC) and .htaccess-denied.
 * NEVER paste a real token into chat, a commit, or a screenshot. If one ever
 * leaks, revoke it in the Slack app's OAuth page immediately - a bot token can
 * read and post in every channel the app is in.
 *
 * SETUP (about 10 minutes, all in the Slack UI)
 * --------------------------------------------
 * 1. https://api.slack.com/apps -> Create New App -> From scratch.
 *    Name it "365 Techies Portal", pick the 365 Techies workspace.
 * 2. OAuth & Permissions -> Bot Token Scopes, add:
 *       chat:write          (post the customer's message)
 *       groups:history      (read replies - PRIVATE channel)
 *       channels:history    (read replies - PUBLIC channel; add whichever
 *                            matches the channel you use, or both)
 * 3. Install to Workspace. Copy the "Bot User OAuth Token" - it starts xoxb-.
 * 4. In Slack, create the channel (e.g. #customer-support) and INVITE THE APP:
 *       /invite @365 Techies Portal
 *    Without the invite every call fails with not_in_channel.
 * 5. Get the channel ID: open the channel -> click its name -> the ID (starts
 *    C or G) is at the bottom of the dialog. The ID is safer than the name,
 *    which changes if anyone renames the channel.
 * 6. Put both values below, save this file as pcm-slack-bot.php in /api/ on the
 *    server (SiteGround File Manager is fine), and add the cron:
 *       * * * * *  /usr/bin/php /home/customer/www/365techies.co.uk/public_html/api/pcm-msg-poll.php >/dev/null 2>&1
 *    (check the real path in Site Tools; the cron runs as CLI, which is what
 *     lets it work at all - see the note in pcm-msg-poll.php)
 *
 * There is NO Slack "Event Subscription" to configure, and you should not add
 * one: SiteGround's WAF answers Slack's POSTs with a captcha page and HTTP 202,
 * which Slack counts as success - every message would vanish silently. The
 * cron pulls instead.
 *
 * The free Slack plan is fine. This portal keeps every message itself, so
 * Slack's 90-day history limit only affects what engineers can scroll back to
 * inside Slack.
 */

$SLACK_BOT_TOKEN = 'xoxb-REPLACE-ME';
$SLACK_CHANNEL   = 'C0REPLACEME';     // channel ID, not the #name
