# Letterboxd Custom Backdrops

Adds a custom backdrop to your profile, list, and film pages that don’t have one.

All the customization this script provides is local and won't be visible to other users.

## Installation

1. Install the [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) extension.
2. Then, [click here and press install](https://tetrax-10.github.io/letterboxd-custom-backdrops/lcb.user.js).
3. Done! 🎉

## Usage

To open script settings, click on the tampermonkey icon in your browser and click the gear icon.

![open script settings](https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshot/script_settings.jpg)

#### Custom Profile Backdrop

1. Go to [your profile settings page](https://letterboxd.com/settings/) and copy your `Username`.
2. Open the script settings and paste your `Username` in the respective field.
3. Also, paste the URL of a backdrop image you like in the respective field. (TMDB images are recommended).
4. Done! 🎉

<table>
  <tr align="center">
    <td>Before</td>
    <td>After</td>
  </tr>
  <tr align="center">
    <td>
      <img alt="Before" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/profile_before.jpg" style="width: 400px;">
    </td>
    <td>
      <img alt="After" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/profile_after.jpg" style="width: 400px;">
    </td>
  </tr>
</table>

#### Custom Film/List Backdrop

1. Go to a film or list page you want to change the backdrop for and copy the film ID from the [share link](https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshot/share.jpg).
2. For example, [The Florida Project (2017)](https://letterboxd.com/film/the-florida-project/)'s film ID is `dMG0`.
3. Open the script settings and click `New Custom Backdrop`.
4. Paste the film ID in the respective field.
5. Also, paste the URL of the backdrop you want in the respective field.
6. Done! 🎉

<table>
  <tr align="center">
    <td>Before</td>
    <td>After</td>
  </tr>
  <tr align="center">
    <td>
      <img alt="Before" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/custom_film_before.jpg" style="width: 400px;">
    </td>
    <td>
      <img alt="After" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/custom_film_after.jpg" style="width: 400px;">
    </td>
  </tr>
    <tr align="center">
    <td>
      <img alt="Before" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/list_before.jpg" style="width: 400px;">
    </td>
    <td>
      <img alt="After" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/list_after.jpg" style="width: 400px;">
    </td>
  </tr>
</table>

#### Automatically display Backdrops for less popular films

Letterboxd doesn't display backdrops for less popular films. So this script uses your TMDB Api to fetch backdrop automatically for those films and display them.

1. paste your [TMDB API Key](https://www.themoviedb.org/settings/api) in the script settings.
2. Done! 🎉

<table>
  <tr align="center">
    <td>Before</td>
    <td>After</td>
  </tr>
  <tr align="center">
    <td>
      <img alt="Before" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/film_before.jpg" style="width: 400px;">
    </td>
    <td>
      <img alt="After" src="https://raw.githubusercontent.com/Tetrax-10/letterboxd-custom-backdrops/main/screenshots/film_after.jpg" style="width: 400px;">
    </td>
  </tr>
</table>

### Todos

-   Add support for actor, director pages
-   Add support for review pages
-   Add support for other user's profile pages
