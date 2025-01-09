# iWantACat-website
Website for [iwanta.cat](https://iwanta.cat)

## Setup and Running the Project

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Gulp CLI (v2 or higher)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/b0t-at/iWantACat-website.git
   cd iWantACat-website
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```

### Development
1. Run the Gulp tasks to download assets, optimize and minify CSS and JavaScript files:
   ```sh
   npm run predeploy
   ```

2. Run dev webserver
   ```sh
   npm run dev
   ```

### Deployment
1. Run the predeploy script to prepare the project for deployment:
   ```sh
   npm run predeploy
   ```

2. Deploy the contents of the `dist` folder to your web server or hosting service.

## Custom Styling
The custom styles for the website are located in the `assets/styles.css` file. You can modify this file to change the appearance of the website.

## Using Bootstrap and Sass
The project includes Bootstrap and Sass for improved design and maintainability. You can use Bootstrap classes in your HTML and customize the styles using Sass.

To compile Sass to CSS, run the following command:
```sh
npm run sass
```
