{

    'target_defaults': {
        'default_configuration': 'Release',
    },


    'targets': [
        {
            'target_name': "cloudcv",

            'sources': [ 
                "sources/cloudcv.cpp", 
                "sources/cloudcv.hpp",

                "sources/framework/marshal/marshal.hpp",                
                "sources/framework/marshal/marshal.cpp",

                "sources/framework/marshal/stl.hpp",                
                "sources/framework/marshal/stl.cpp",
                
                "sources/framework/marshal/opencv.hpp",                
                "sources/framework/marshal/opencv.cpp",
                
                "sources/framework/marshal/primitives.hpp",                
                "sources/framework/marshal/primitives.cpp",

                "sources/framework/marshal/node_object_builder.hpp",
                "sources/framework/marshal/node_object_builder.cpp",
                
                "sources/framework/Image.hpp",                
                "sources/framework/Image.cpp",

                "sources/framework/ImageSource.hpp",                
                "sources/framework/ImageSource.cpp",

                "sources/framework/Job.hpp",                
                "sources/framework/Job.cpp",

                "sources/framework/Async.hpp",
                "sources/framework/Async.cpp",
                    
                "sources/framework/NanCheck.hpp",
                "sources/framework/NanCheck.cpp",
                
                "sources/modules/common/Numeric.cpp", 
                "sources/modules/common/Numeric.hpp",                 

                "sources/modules/common/Color.hpp", 
                "sources/modules/common/ScopedTimer.hpp", 

                "sources/modules/common/ImageUtils.hpp", 
                "sources/modules/common/ImageUtils.cpp", 

                "sources/modules/analyze/analyze.cpp", 
                "sources/modules/analyze/analyze.hpp", 
                "sources/modules/analyze/binding.cpp", 
                "sources/modules/analyze/dominantColors.hpp", 
                "sources/modules/analyze/dominantColors.cpp", 

                "sources/modules/buildInformation/buildInformation.cpp", 

                "sources/modules/cameraCalibration/CameraCalibrationBinding.cpp", 
                "sources/modules/cameraCalibration/CameraCalibrationAlgorithm.hpp", 
                "sources/modules/cameraCalibration/CameraCalibrationAlgorithm.cpp", 
            ],

            'include_dirs': [
              'src/',
              "<!(node -e \"require('nan')\")",
              "<!(node -e \"require('native-opencv').include_dirs()\")"
            ],

            'libraries': [
                ">!(node -e \"require('native-opencv').libraries()\")"
            ],

            'target_conditions': [
            
                ['OS=="mac"', {
                
                    'defines': [
                        'TARGET_PLATFORM_MAC',
                    ],

                    'xcode_settings': {
                        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                        'OTHER_CFLAGS': [ '-g', '-mmacosx-version-min=10.7', '-std=c++11', '-stdlib=libc++', '-O3', '-Wall' ],
                        'OTHER_CPLUSPLUSFLAGS': [ '-g', '-mmacosx-version-min=10.7', '-std=c++11', '-stdlib=libc++', '-O3', '-Wall' ]
                    }
                }],

                
                ['OS=="linux"', {
                
                    'defines': [
                        'TARGET_PLATFORM_LINUX',
                    ],

                    'libraries!': [ '-undefined dynamic_lookup' ],

                    'cflags_cc!': [ '-fno-exceptions' ],
                    "cflags": [ '-std=gnu++11', '-fexceptions' ],                    
                }],

                ['OS=="win"', {
                    'defines': [
                        'TARGET_PLATFORM_WINDOWS',
                    ]             
                }]

            ]
        }
    ]
}
