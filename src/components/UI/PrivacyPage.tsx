import { LegalArticle } from './LegalArticle';
import { LEGAL_CONTACT, PRIVACY_UPDATED } from '../../constants/legal';

/**
 * Privacy Policy. Written to match what the code actually does (see
 * supabase/migrations/20261123000000_launch_hardening.sql and
 * src/utils/errorReporter.ts). Have it reviewed before promoting the app,
 * and update it whenever data handling changes.
 */
export const PrivacyPage: React.FC = () => (
  <LegalArticle title="Privacy Policy" updated={PRIVACY_UPDATED}>
    <p>
      Grid Genius is a free maths puzzle game. It has no ads, does not sell data and does not use
      tracking cookies. This page explains what is stored and why.
    </p>

    <h2>Playing without an account</h2>
    <p>
      You can play everything except leaderboards and online matches without signing in. Your
      progress, settings, stars and streaks are saved only in your browser on this device. We never
      receive them. Clearing your browser data removes them.
    </p>

    <h2>Multiplayer as a guest</h2>
    <p>
      You can play online matches without an account. Tapping &quot;Play as guest&quot; creates a
      random guest ID (no email, no name) so the server can run your matches. We store that ID and
      your match results. Guest games are unrated, guest profiles are private, and guests inactive
      for 30 days are deleted automatically. Your opponent sees a generated guest name.
    </p>

    <h2>Class races</h2>
    <p>
      In a class race, students join with a room code and a nickname as guests — no email or
      account. We store the nickname, score and answers for that room so the leaderboard works.
      Nicknames are checked against a word filter and should not be real names. Rooms and everything
      in them are deleted after 7 days.
    </p>

    <h2>Accounts (13 and over)</h2>
    <p>Accounts are for people aged 13 or older. If you sign in, we store:</p>
    <ul>
      <li>
        your email address, or your Google or Apple account identifier if you use those to sign in;
      </li>
      <li>your player handle and display name, plus an avatar, country or bio if you add them;</li>
      <li>your game progress, daily puzzle results, ratings and multiplayer match results.</li>
    </ul>
    <p>
      We use this only to run the game: syncing your progress, the daily leaderboard, ratings and
      matchmaking. To keep leaderboards fair, the server records when you start the daily puzzle and
      checks each answer you submit. Unusually fast results may be reviewed for cheating.
    </p>

    <h2>What other players can see</h2>
    <p>
      If your profile is public (you can turn this off), others can see your handle, display name,
      avatar, country and ratings. Daily leaderboards show your handle, solve time and number of
      tries. Match opponents see your handle.
    </p>

    <h2>Crash reports</h2>
    <p>
      When the app hits an error, it sends a short report so we can fix it: the error message, the
      page it happened on, the app version and your browser type. Reports are not linked to your
      account and are deleted after 90 days.
    </p>

    <h2>Analytics</h2>
    <p>
      Analytics are off unless you turn them on in Settings. If you do, we use Plausible, which
      counts page visits without cookies and without collecting personal data.
    </p>

    <h2>Services we rely on</h2>
    <ul>
      <li>GitHub Pages hosts the app and may log visitors’ IP addresses for security.</li>
      <li>Supabase stores account data and handles sign-in.</li>
      <li>Google and Apple, only if you choose to sign in with them.</li>
      <li>Plausible, only if you turn on analytics.</li>
    </ul>

    <h2>Children</h2>
    <p>
      Children under 13 should play without an account, which keeps all of their progress on their
      own device. If we learn that an account belongs to a child under 13, we will delete it.
    </p>

    <h2>Your choices and rights</h2>
    <ul>
      <li>
        <strong>Download your data:</strong> Settings → Account &amp; privacy → “Download my data”.
      </li>
      <li>
        <strong>Delete your account:</strong> Settings → Account &amp; privacy → “Delete account”.
        Your profile is hidden at once and everything is permanently deleted within 30 days.
      </li>
      <li>
        <strong>Correct your details:</strong> edit your profile at any time.
      </li>
    </ul>

    <h2>Changes and contact</h2>
    <p>
      If this policy changes, the date at the top will change too. Questions or requests:{' '}
      <a href={LEGAL_CONTACT.href} className="underline" target="_blank" rel="noreferrer">
        {LEGAL_CONTACT.label}
      </a>
      .
    </p>
  </LegalArticle>
);
