#include "Image.hpp"
#include "framework/marshal/marshal.hpp"
#include "framework/NanCheck.hpp"
#include "framework/Job.hpp"
#include "framework/marshal/node_object_builder.hpp"
#include "framework/ImageSource.hpp"
#include "framework/Async.hpp"

#include <node.h>
#include <v8.h>

using namespace v8;

#define SETUP_FUNCTION(TYP) \
    NanEscapableScope();      \
    TYP *self = ObjectWrap::Unwrap<TYP>(args.This());

namespace cloudcv
{
    enum EncodeOutputFormat {
        EncodeOutputFormatJpeg,
        EncodeOutputFormatWebp,
        EncodeOutputFormatPng
    };

    class EncodeImageTask : public Job
    {
    public:
        EncodeImageTask(cv::Mat image, NanCallback * callback, EncodeOutputFormat fmt, bool returnDataUri = false)
            : Job(callback)
            , mImage(image)
            , mFormat(fmt)
            , mReturnDataUri(returnDataUri)
        {
        }

        virtual ~EncodeImageTask()
        {
        }

    protected:

        virtual void ExecuteNativeCode()
        {
            std::string mimeType;

            switch (mFormat)
            {
            case EncodeOutputFormatPng:
                cv::imencode(".png", mImage, mEncodedData);
                mimeType = "image/png";
                break;

            case EncodeOutputFormatJpeg:
                cv::imencode(".jpeg", mImage, mEncodedData);
                mimeType = "image/jpeg";
                break;

            case EncodeOutputFormatWebp:
                cv::imencode(".webp", mImage, mEncodedData);
                mimeType = "image/webp";
                break;

            default:
                SetErrorMessage("Given format is not supported");
                return;
            };

            if (mReturnDataUri)
            {
                mDataUriString << "data:" << mimeType << ";base64,";
                Base64Encode(mEncodedData, mDataUriString);
            }
        }

        // This function is executed in the main V8/JavaScript thread. That means it's
        // safe to use V8 functions again. Don't forget the HandleScope!
        virtual Local<Value> CreateCallbackResult()
        {
            NanEscapableScope();
            if (mReturnDataUri)
                return NanEscapeScope(MarshalFromNative(mDataUriString.str()));
            else
                return NanEscapeScope(MarshalFromNative(mEncodedData));
        }

    private:

        static void Base64Encode(const std::vector<uint8_t>& data, std::ostringstream& encoded_data)
        {
            static size_t mod_table[] = { 0, 2, 1 };
            static char encoding_table[] = {
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
                'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
                'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
                'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
                'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
                'w', 'x', 'y', 'z', '0', '1', '2', '3',
                '4', '5', '6', '7', '8', '9', '+', '/'
            };

            size_t input_length = data.size();
            //size_t output_length = 4 * ((input_length + 2) / 3);
            //encoded_data.resize(output_length);

            for (size_t i = 0; i < input_length;)
            {
                uint32_t octet_a = i < input_length ? data[i++] : 0;
                uint32_t octet_b = i < input_length ? data[i++] : 0;
                uint32_t octet_c = i < input_length ? data[i++] : 0;

                uint32_t triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

                encoded_data << encoding_table[(triple >> 3 * 6) & 0x3F]
                    << encoding_table[(triple >> 2 * 6) & 0x3F]
                    << encoding_table[(triple >> 1 * 6) & 0x3F]
                    << encoding_table[(triple >> 0 * 6) & 0x3F];
            }

            // Extra padding
            for (size_t i = 0; i < mod_table[input_length % 3]; i++)
            {
                encoded_data << '=';
            }
        }

    private:
        cv::Mat                 mImage;
        EncodeOutputFormat      mFormat;
        bool                    mReturnDataUri;
        std::vector<uint8_t>    mEncodedData;
        std::ostringstream      mDataUriString;
    };

    v8::Persistent<v8::FunctionTemplate> ImageView::constructor;

    ImageView::ImageView(const cv::Mat& image)
        : mImage(image)
    {

    }

    NAN_METHOD(ImageView::Width)
    {
        SETUP_FUNCTION(ImageView);
        int width = self->mImage.cols;
        NanReturnValue(NanNew<v8::Integer>(width));
    }

    NAN_METHOD(ImageView::Height)
    {
        SETUP_FUNCTION(ImageView);
        int height = self->mImage.rows;
        NanReturnValue(NanNew<v8::Integer>(height));
    }

    NAN_METHOD(ImageView::Channels)
    {
        SETUP_FUNCTION(ImageView);
        NanReturnValue(NanNew<v8::Integer>(self->mImage.channels()));
    }

    NAN_METHOD(ImageView::Type)
    {
        SETUP_FUNCTION(ImageView);
        NanReturnValue(NanNew<v8::Integer>(self->mImage.type()));
    }

    NAN_METHOD(ImageView::Stride)
    {
        SETUP_FUNCTION(ImageView);
        // Temporary hack:
        // https://github.com/rvagg/nan/issues/270
        // https://github.com/BloodAxe/CloudCV/issues/3
        uint32_t stride = static_cast<uint32_t>(self->mImage.step[0]);
        NanReturnValue(NanNew<v8::Integer>(stride));
    }

    NAN_METHOD(ImageView::AsJpegStream)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;
        std::string error;
        
        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(1)
            .Argument(0).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);
            NanAsyncQueueWorker(new EncodeImageTask(self->mImage, callback, EncodeOutputFormatJpeg));
            NanReturnUndefined();
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }

    NAN_METHOD(ImageView::AsPngStream)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;
        std::string error;

        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(1)
            .Argument(0).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);
            NanAsyncQueueWorker(new EncodeImageTask(self->mImage, callback, EncodeOutputFormatPng));
            NanReturnUndefined();
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }

    NAN_METHOD(ImageView::Thumbnail)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;

        int w, h;
        std::string error;
        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(3)
            .Argument(0).Bind(w)
            .Argument(1).Bind(h)
            .Argument(2).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);

            auto task = [w,h, self](AsyncReturnHelper& result, AsyncErrorFunction error) {
                if (self->mImage.empty()) {
                     error("Image is empty");
                     return;                    
                }

                cv::Mat thumb;
                cv::resize(self->mImage, thumb, cv::Size(w,h));
                result(thumb);
            };
            
            Async(task, callback);
            NanReturnUndefined();
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }

    NAN_METHOD(ImageView::AsPngDataUri)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;
        std::string error;

        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(1)
            .Argument(0).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);
            NanAsyncQueueWorker(new EncodeImageTask(self->mImage, callback, EncodeOutputFormatPng, true));
            NanReturnValue(NanTrue());
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }

    NAN_METHOD(ImageView::AsObject)
    {
        SETUP_FUNCTION(ImageView);
        Local<Object> res = NanNew<Object>();
        cv::Mat image = self->mImage;

        NodeObject resultWrapper(res);
        resultWrapper["size"] = image.size();
        resultWrapper["channels"] = image.channels();

        size_t length = image.total() * image.channels();

        switch (image.depth())
        {
        case CV_8U:
            resultWrapper["depth"] = "CV_8U";
            resultWrapper["data"] = std::vector<uint8_t>((uint8_t*)image.data, (uint8_t*)image.data + length);
            break;

        case CV_16U:
            resultWrapper["depth"] = "CV_16U";
            resultWrapper["data"] = std::vector<uint16_t>((uint16_t*)image.data, (uint16_t*)image.data + length);
            break;

        case CV_16S:
            resultWrapper["depth"] = "CV_16S";
            resultWrapper["data"] = std::vector<int16_t>((int16_t*)image.data, (int16_t*)image.data + length);
            break;

        case CV_32S:
            resultWrapper["depth"] = "CV_32S";
            resultWrapper["data"] = std::vector<int16_t>((int32_t*)image.data, (int32_t*)image.data + length);
            break;

        case CV_32F:
            resultWrapper["depth"] = "CV_32F";
            resultWrapper["data"] = std::vector<float>((float*)image.data, (float*)image.data + length);
            break;

        case CV_64F:
            resultWrapper["depth"] = "CV_64F";
            resultWrapper["data"] = std::vector<double>((double*)image.data, (double*)image.data + length);
            break;

        default:
            break;
        };

        NanReturnValue(res);
    }


    NAN_METHOD(ImageView::AsJpegDataUri)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;
        std::string error;

        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(1)
            .Argument(0).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);
            NanAsyncQueueWorker(new EncodeImageTask(self->mImage, callback, EncodeOutputFormatJpeg, true));
            NanReturnValue(NanTrue());
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }
    
    ////////////////////////////////////////
    // team-ggv
    ////////////////////////////////////////
    
    NAN_METHOD(ImageView::Compare)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;
        
        std::string keypoints;
        std::string descriptors;
        std::string error;
        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(3)
            .Argument(0).Bind(keypoints)
            .Argument(1).Bind(descriptors)
            .Argument(2).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);
            
            auto task = [self, keypoints, descriptors](AsyncReturnHelper& result, AsyncErrorFunction error) {
                
                /*******************************/
        		/* LOAD YMLS */
        		/*******************************/
                
                std::vector<cv::KeyPoint> pKeypoints;
	            cv::Mat pDescriptors;
                
                cv::FileStorage fs1(keypoints, cv::FileStorage::READ);
        		fs1["data"] >> pKeypoints;
        		fs1.release();
                
                cv::FileStorage fs2(descriptors, cv::FileStorage::READ);
        		fs2["data"] >> pDescriptors;
        		fs2.release();
                
                /*******************************/
        		/* COMPARE */
        		/*******************************/
                
                cv::BFMatcher matcher(cv::NORM_HAMMING2);
	            std::vector<cv::DMatch> matches;
	            matcher.match(self->mDescriptors, pDescriptors, matches);
                
                cv::Mat homography;

        		//-- Quick calculation of max and min distances between keypoints
        		double max_dist = 0;
        		double min_dist = 100;
        
        		for (int i = 0; i < self->mDescriptors.rows; i++) {
        			double dist = matches[i].distance;
        			if (dist < min_dist) {
        				min_dist = dist;
        			}
        
        			if (dist > max_dist) {
        				max_dist = dist;
        			}
        		}
        
        		//-- "good" matches (i.e. whose distance is less than 3*min_dist )
        		std::vector<cv::DMatch> good_matches;
        
        		int rows = self->mDescriptors.rows;
        		for (int i = 0; i < rows; i++) {
        			if (matches[i].distance <= 3 * min_dist) {
        				good_matches.push_back(matches[i]);
        			}
        		}
                
                if (good_matches.size() < 4)
        		{
        		    
        			result(false);
        			
        		} else {
		            
		            //-- Localize the object
            		std::vector<cv::Point2f> img1;
            		std::vector<cv::Point2f> img2;
            
            		for (size_t i = 0; i < good_matches.size(); i++) {
            			//-- Get the keypoints from the good matches
            			img1.push_back(self->mKeypoints[good_matches[i].queryIdx].pt);
            			img2.push_back(pKeypoints[good_matches[i].trainIdx].pt);
            		}
            
            		/*******************************/
            		/* COINCIDE */
            		/*******************************/
            
            		std::vector<double> coeffs;
            
            		homography = cv::findHomography(img1, img2, cv::LMEDS, 3);
            		
		            const double det = cv::determinant(homography);
                	const double n1 = sqrt(homography.at<double>(0, 0) * homography.at<double>(0, 0) + homography.at<double>(1, 0) * homography.at<double>(1, 0));
                	const double n2 = sqrt(homography.at<double>(0, 1) * homography.at<double>(0, 1) + homography.at<double>(1, 1) * homography.at<double>(1, 1));
                	const double n3 = sqrt(homography.at<double>(2, 0) * homography.at<double>(2, 0) + homography.at<double>(2, 1) * homography.at<double>(2, 1));
                	
                	coeffs.push_back(det);
                	coeffs.push_back(n1);
                	coeffs.push_back(n2);
                	coeffs.push_back(n3);
                	
                	if (det < 0 || fabs(det) < 2e-05) {
                		result(false);
                	} else if (n1 > 4 || n1 < 0.1) {
                		result(false);
                	} else if (n2 > 4 || n2 < 0.1) {
                		result(false);
                	} else if (n3 > 0.002) {
                		result(false);
                	} else {
                	    int good = good_matches.size();
                	    result(good);
                	}
        		}
        		
            };
            
            Async(task, callback);
            NanReturnUndefined();
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }
    
    NAN_METHOD(ImageView::Compute)
    {
        SETUP_FUNCTION(ImageView);
        Local<Function> imageCallback;

        int size;
        std::string method;
        std::string error;
        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(2)
            .Argument(0).Bind(method)
            .Argument(1).IsFunction().Bind(imageCallback))
        {
            NanCallback *callback = new NanCallback(imageCallback);

            auto task = [method, self](AsyncReturnHelper& result, AsyncErrorFunction error) {
                if (self->mImage.empty()) {
                     error("Image is empty");
                     return;                    
                }
                
                cv::Mat image = self->mImage;
                cv::Mat imageGrey;
	            
                if ( self->mImage.channels()>1 ) {
		            cv::cvtColor(image, imageGrey, cv::COLOR_RGBA2GRAY);
	            } else {
	                imageGrey = image;
	            }
                
                if ( method == "ORB" ) {
                    cv::ORB orb(800);
                    orb(imageGrey, cv::noArray(), self->mKeypoints, self->mDescriptors);
                } else if ( method == "KAZE" ) {
                    cv::KAZE kaze;
                    kaze(imageGrey, cv::noArray(), self->mKeypoints, self->mDescriptors);
                } else if ( method == "AKAZE" ) {
                    cv::AKAZE akaze;
                    akaze(imageGrey, cv::noArray(), self->mKeypoints, self->mDescriptors);
                } else {
                    error("Method not implemented");
                    return;
                }
                
                // draw the detected keypoint just to check in return
                cv::Mat outputImage;
                cv::Scalar keypointColor = cv::Scalar(255, 0, 0);     // Blue keypoints.
                cv::drawKeypoints(image, self->mKeypoints, outputImage, keypointColor, cv::DrawMatchesFlags::DEFAULT);
	            result(outputImage);
	            
            };
            
            Async(task, callback);
            NanReturnUndefined();
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());
        }
    }
    
    NAN_METHOD(ImageView::Keypoints)
    {
        SETUP_FUNCTION(ImageView);
        
        cv::FileStorage fs1(".yml", cv::FileStorage::WRITE + cv::FileStorage::MEMORY);
		cv::write(fs1, "data", self->mKeypoints);
		std::string buffer = fs1.releaseAndGetString();
		fs1.release();
		
        NanReturnValue(NanNew<v8::String>(buffer.c_str()));
    }
    
    NAN_METHOD(ImageView::Descriptors)
    {
        SETUP_FUNCTION(ImageView);
        
        cv::FileStorage fs1(".yml", cv::FileStorage::WRITE + cv::FileStorage::MEMORY);
		cv::write(fs1, "data", self->mDescriptors);
		std::string buffer = fs1.releaseAndGetString();
		fs1.release();
		
        NanReturnValue(NanNew<v8::String>(buffer.c_str()));
    }
    
    ////////////////////////////////////////
    
    void ImageView::Init(v8::Handle<v8::Object> exports)
    {
        //Class
        v8::Local<v8::FunctionTemplate> tpl = NanNew<FunctionTemplate>(ImageView::New);
        tpl->InstanceTemplate()->SetInternalFieldCount(1);
        tpl->SetClassName(NanNew("ImageView"));

        NODE_SET_PROTOTYPE_METHOD(tpl, "width", ImageView::Width);
        NODE_SET_PROTOTYPE_METHOD(tpl, "height", ImageView::Height);
        NODE_SET_PROTOTYPE_METHOD(tpl, "channels", ImageView::Channels);
        NODE_SET_PROTOTYPE_METHOD(tpl, "type", ImageView::Type);
        NODE_SET_PROTOTYPE_METHOD(tpl, "stride", ImageView::Stride);

        NODE_SET_PROTOTYPE_METHOD(tpl, "asJpegStream", ImageView::AsJpegStream);
        NODE_SET_PROTOTYPE_METHOD(tpl, "asJpegDataUri", ImageView::AsJpegDataUri);
        NODE_SET_PROTOTYPE_METHOD(tpl, "asPngStream", ImageView::AsPngStream);
        NODE_SET_PROTOTYPE_METHOD(tpl, "asPngDataUri", ImageView::AsPngDataUri);
        NODE_SET_PROTOTYPE_METHOD(tpl, "asObject", ImageView::AsObject);

        NODE_SET_PROTOTYPE_METHOD(tpl, "thumbnail", ImageView::Thumbnail);
        
        ////////////////////////////////////////
        // team-ggv
        ////////////////////////////////////////
        NODE_SET_PROTOTYPE_METHOD(tpl, "compute", ImageView::Compute);
        NODE_SET_PROTOTYPE_METHOD(tpl, "compare", ImageView::Compare);
        NODE_SET_PROTOTYPE_METHOD(tpl, "keypoints", ImageView::Keypoints);
        NODE_SET_PROTOTYPE_METHOD(tpl, "descriptors", ImageView::Descriptors);
        ////////////////////////////////////////
        
        NanAssignPersistent(constructor, tpl);
        //constructor = Persistent<Function>::New();
        exports->Set(NanNew<String>("ImageView"), NanNew<FunctionTemplate>(constructor)->GetFunction());
        //std::cout << "ImageView::Init finished" << std::endl;
    }

    NAN_METHOD(loadImage)
    {
        TRACE_FUNCTION;
        NanEscapableScope();

        std::string     imagePath;
        std::string     error;
        Local<Object>   imageBuffer;
        Local<Function> loadCallback;

        if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(2)
            .Argument(0).IsString().Bind(imagePath)
            .Argument(1).IsFunction().Bind(loadCallback))
        {
            NanCallback *callback = new NanCallback(loadCallback);
            auto task = [imagePath](AsyncReturnHelper& result, AsyncErrorFunction error) {
                cv::Mat image = CreateImageSource(imagePath)->getImage();
                if (image.empty())
                    error("Cannot read image from the file");
                else
                    result(image);
            };
            
            Async(task, callback);
            NanReturnUndefined();
        }
        else if (NanCheck(args)
            .Error(&error)
            .ArgumentsCount(2)
            .Argument(0).IsBuffer().Bind(imageBuffer)
            .Argument(1).IsFunction().Bind(loadCallback))
        {
            NanCallback *callback = new NanCallback(loadCallback);
            auto task = [imagePath](AsyncReturnHelper& result, AsyncErrorFunction error) {
                cv::Mat image = CreateImageSource(imagePath)->getImage();
                if (image.empty())
                    error("Cannot decode image from the buffer");
                else
                    result(image);
            };
            
            Async(task, callback);
            NanReturnUndefined();
        }
        else if (!error.empty())
        {
            NanThrowTypeError(error.c_str());                
        }
    }

    NAN_METHOD(ImageView::New)
    {
        NanEscapableScope();

        if (args.This()->InternalFieldCount() == 0)
            return NanThrowError("Cannot instantiate without new");

        std::string filename;
        MarshalToNative(args[0], filename);

        cv::Mat im = cv::imread(filename.c_str());
        auto imageView = new ImageView(im);

        imageView->Wrap(args.Holder());
        NanReturnValue(args.Holder());
    }

    v8::Local<v8::Value> ImageView::ViewForImage(cv::Mat image)
    {        
        NanEscapableScope();
        // Insiped by SO: http://stackoverflow.com/questions/16600735/what-is-an-internal-field-count-and-what-is-setinternalfieldcount-used-for
        Local<Object> holder = NanNew<FunctionTemplate>(constructor)->GetFunction()->NewInstance();

        ImageView * imageView = new ImageView(image);
        imageView->Wrap(holder);
        return NanEscapeScope(holder);
    }
}