'use strict';
var pkg = require('./package.json');
var currentTime = +new Date();
var versionedAssetPath = 'assets';
var CDN = 'https://interactive.guim.co.uk/';
var deployAssetPath = CDN + pkg.config.s3_folder + versionedAssetPath;
var localAssetPath = 'http://localhost:' + pkg.config.port + '/assets';
// var localAssetPath = 'http://guardianau-dcd-preview.s3.amazonaws.com/lexus-interactive/assets';

module.exports = function(grunt) {
  var isDev = !(grunt.cli.tasks && grunt.cli.tasks[0] === 'deploy');
  grunt.initConfig({

    connect: {
      server: {
        options: {
          port: pkg.config.port,
          hostname: '*',
          base: './build/',
          middleware: function (connect, options, middlewares) {
            // inject a custom middleware http://stackoverflow.com/a/24508523 
            middlewares.unshift(function (req, res, next) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', '*');
                return next();
            });
            return middlewares;
          }
        }
      }
    },

    bowerRequirejs: {
        all: {
            rjsConfig: './src/js/require.js',
            options: {
                baseUrl: './src/js/'
            }
        }
    },

    sass: {
      options: {
            style: (isDev) ? 'expanded' : 'compressed',
            sourcemap: 'inline'
       },
        build: {
            files: { 'build/assets/css/main.css': 'src/css/main.scss' }
        }
    },

    clean: ['build/'],

    jshint: {
      options: {
          jshintrc: true,
          force: true,
          maxlen: 5000
      },
        files: [
            'Gruntfile.js',
            'src/**/*.js',
            '!src/js/require.js'
        ]
    },

    requirejs: {
      compile: {
        options: {
          baseUrl: './src/js/',
          mainConfigFile: './src/js/require.js',
          optimize: 'uglify2',
          inlineText: true,
          name: 'almond',
          out: 'build/assets/js/main.js',
          generateSourceMaps: false,
          preserveLicenseComments: false,
          useSourceUrl: true,
          include: ['main'],
          wrap: {
            start: 'define(["require"],function(require){var req=(function(){',
            end: 'return require; }()); return req; });'
          }
        }
      }
    },

    watch: {
      scripts: {
        files: [
          'src/**/*.js',
          'src/**/*.json',
          'src/js/templates/*.html'
        ],
        tasks: ['copy','jshint', 'requirejs', 'replace:local'],
        options: {
          spawn: false,
          livereload: true
        }
      },
      html: {
        files: ['src/*.html', 'src/embed/*.html'],
        tasks: ['copy', 'replace:local'],
        options: {
          spawn: false,
          livereload: true
        }
      },
      css: {
        files: ['src/css/**/*.*'],
        tasks: ['sass', 'postcss', 'replace:local'],
        options: {
          spawn: false,
          livereload: true
        }
      },
      images: {
        files: ['src/imgs/**/*.*'],
        tasks: ['imagemin'],
        options: {
          spawn: false,
          livereload: true
        }
      },
      videos: {
        files: ['src/vids/**/*.*'],
        tasks: ['copy'],
        options: {
          spawn: false,
          livereload: true
        }
      }
    },

    copy: {
      build: {
        files: [
          {
              cwd: 'src/',
              src: ['index.html', 'boot.js', 'embed/*.*', 'vids/*.*'],
              expand: true,
              dest: 'build/'
          },
          {
              src: 'bower_components/curl/dist/curl/curl.js',
              dest: 'build/assets/js/curl.js'
          },
          {
              cwd: 'src/',
              src: ['vids/*.*'],
              expand: true,
              dest: 'build/assets/'
          }
        ]
      }
    },

    imagemin: {
      options: {
        optimizationLevel: 3,
        svgoPlugins: [{ removeViewBox: false }],
      },
      dynamic: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: ['imgs/**/*.{png,jpg,gif,svg}'],
          dest: 'build/assets/'
        }]
      }
    },

    replace: {
        prod: {
            options: {
                patterns: [{
                  match: /@@assetPath@@/g,
                  replacement: deployAssetPath 
                }]
            },
            files: [{
                src: ['build/**/*.html', 'build/**/*.js', 'build/**/*.css'],
                dest: './'
            }]
        },
        local: {
            options: {
                patterns: [{
                  match: /@@assetPath@@/g,
                  replacement: localAssetPath
                }]
            },
            files: [{
                src: ['build/**/*.html', 'build/**/*.js', 'build/**/*.css'],
                dest: './'
            }]
        }
    },

    s3: {
        options: {
            access: 'public-read',
            bucket: 'gdn-cdn',
            maxOperations: 20,
            dryRun: (grunt.option('test')) ? true : false,
            headers: {
                CacheControl: 180,
            },
            gzip: true,
            gzipExclude: ['.jpg', '.gif', '.jpeg', '.png']
        },
        base: {
            files: [{
                cwd: 'build',
                src: ['*.*', 'embed/*.*'],
                dest: pkg.config.s3_folder
            }]
        },
        assets: {
            options: {
                headers: {
                    CacheControl: 3600,
                }
            },
            files: [{
                cwd: 'build',
                src: versionedAssetPath + '/**/*.*',
                dest: pkg.config.s3_folder
            }]
        }
    },

    rename: {
        main: {
            files: [
                {
                    src: 'build/assets',
                    dest: 'build/' + versionedAssetPath
                }
            ]
        }
    },

    postcss: {
        options: {
            map: true,
            processors: [
                require('autoprefixer')
            ]
        },
        dist: {
            src: 'build/assets/css/*.css'
        }
    },

  });

  // Task pluginsk
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-aws');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-contrib-rename');
  grunt.loadNpmTasks('grunt-bower-requirejs');
  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-postcss');

  // Tasks
  grunt.registerTask('build', [
    'jshint',
    'clean',
    'sass',
    'postcss',
    'bowerRequirejs',
    'requirejs',
    'copy',
    'newer:imagemin'
  ]);
  
  grunt.registerTask('default', [
      'build',
      'replace:local',
      'connect',
      'watch'
  ]);
  
  grunt.registerTask('deploy', [
      'build',
      'rename',
      'replace:prod'
  ]);
};
