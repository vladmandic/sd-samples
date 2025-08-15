# SD.Next Model Samples Gallery  

**SD.Next Model Samples** is a pre-generated image gallery with 60 models (45 base and 15 finetunes) and 40 different styles resulting in 2,400 high resolution images!  
Gallery additionally includes model details such as typical load and inference times as well as sizes and types of each model component (*e.g. unet, transformer, text-encoder, vae*)  

[Live page](https://vladmandic.github.io/sd-samples/compare.html) | [GitHub repo](https://github.com/vladmandic/sd-samples)

![sd-samples](https://github.com/user-attachments/assets/3efc8603-0766-4e4e-a4cb-d8c9b13d1e1d)

> NOTE  
> Gallery will be extended with additional model types as new models are published  

## Notes  

- Images generated using [SD.Next](https://github.com/vladmandic/sdnext)  
  using simple script that invokes `sdnext` API  
  parameters are set to model-default values and using fixed 20-steps to ensure consistency accross all models  
  only parameter that varies is prompt itself!  
- Compute is performed using `RTX4090` with following SD.Next params:  
  performance mode, balanced offloading, sdnq int8 quantization  
- Web page is a simple *HTML/JS/CSS* static page with no dependencies  
