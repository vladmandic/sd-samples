#!/usr/bin/env python
"""
Warnings:
- fal/AuraFlow-v0.3: layer_class_name=Linear layer_weight_shape=torch.Size([3072, 2, 1024]) weights_dtype=int8 unsupported
- Kwai-Kolors/Kolors-diffusers: set_input_embeddings not autohandled for ChatGLMModel
- kandinsky-community/kandinsky-2-1: get_input_embeddings not autohandled for MultilingualCLIP
Errors:
- kandinsky-community/kandinsky-3: corrupt output
Other:
- Wan-AI/Wan2.2-T2V-A14B-Diffusers: extreme memory usage
- HiDream-ai/HiDream-I1-Full: very slow at 30+s/it
"""

import io
import os
import time
import json
import base64
import logging
from logging.handlers import RotatingFileHandler
import requests
import urllib3
import pathvalidate
from PIL import Image
from config import models, styles


log = logging.getLogger(__name__)
output_folder = 'images'
output_thumb = 'thumbs'
output_images = 'images.json'
output_models = 'models.json'
output_details = False
thumb_size = (128,128)
images_data = []
models_data = []


def read_history():
    global images_data, models_data # pylint: disable=global-statement
    if os.path.exists(output_images):
        with open(output_images, "r", encoding='utf8') as file:
            data = file.read()
            images_data = json.loads(data)
    log.info(f'history: type=images file="{output_images}" records={len(images_data)}')
    if os.path.exists(output_models):
        with open(output_models, "r", encoding='utf8') as file:
            data = file.read()
            models_data = json.loads(data)
    log.info(f'history: type=models file="{output_models}" records={len(models_data)}')


def write_images(repo:str, style:str, image:str='', size:tuple=(0,0), generate:float=0, params:dict={}, info:str=''):
    fn = os.path.join(output_images)
    info = json.loads(info)
    images_data.append({
        'repo': repo,
        'title': repo.split('/')[-1].replace('_diffusers', '').replace('-diffusers', ''),
        'style': style,
        'image': image,
        'size': size,
        'time': generate,
        'prompt': info.get('prompt', ''),
        'seed': info.get('seed', 0),
        'steps': info.get('steps', 0),
        'params': params if output_details else {},
        'info': info if output_details else {},
    })
    with open(fn, "w", encoding='utf8') as file:
        data = json.dumps(images_data, indent=2) # pylint: disable=no-member
        file.write(data)


def write_model(dct: dict):
    if any(m['model'] == dct['model'] for m in models_data): # already exists
        return
    fn = os.path.join(output_models)
    dct['modules'] = [m for m in dct['modules'] if m['params'] > 0]
    models_data.append(dct)
    with open(fn, "w", encoding='utf8') as file:
        data = json.dumps(models_data, indent=2) # pylint: disable=no-member
        file.write(data)


def request(endpoint: str, dct: dict = None, method: str = 'POST'):
    def auth():
        if sd_username is not None and sd_password is not None:
            return requests.auth.HTTPBasicAuth(sd_username, sd_password)
        return None
    sd_url = os.environ.get('SDAPI_URL', "http://127.0.0.1:7860")
    sd_username = os.environ.get('SDAPI_USR', None)
    sd_password = os.environ.get('SDAPI_PWD', None)
    method = requests.post if method.upper() == 'POST' else requests.get
    req = method(f'{sd_url}{endpoint}', json = dct, timeout=300000, verify=False, auth=auth())
    if req.status_code != 200:
        return { 'error': req.status_code, 'reason': req.reason, 'url': req.url }
    else:
        return req.json()


def main(): # pylint: disable=redefined-outer-name
    idx_model = 0
    idx_images = 0
    t_generate0 = time.time()
    log.info(f'generate: models={len(models)} styles={len(styles)}')
    request('/sdapi/v1/unload-checkpoint', method='POST')
    for model, args in models.items():
        t_model0 = time.time()
        idx_model += 1
        model_name = pathvalidate.sanitize_filename(model, replacement_text='_')
        log.info(f'model: n={idx_model+1}/{len(models)} name="{model}"')
        idx_style = 0
        loaded_model = None
        for s, (style, prompt) in enumerate(styles.items()):
            try:
                model_name = pathvalidate.sanitize_filename(model, replacement_text='_')
                style_name = pathvalidate.sanitize_filename(style, replacement_text='_')
                fn = os.path.join(output_folder, f'{model_name}__{style_name}.jpg')
                if os.path.exists(fn):
                    continue
                if loaded_model != model:
                    t_load0 = time.time()
                    request(f'/sdapi/v1/checkpoint?sd_model_checkpoint={model}', method='POST')
                    checkpoint = request('/sdapi/v1/checkpoint', method='GET')
                    t_load1 = time.time()
                    if not checkpoint or not (model in checkpoint.get('checkpoint') or model in checkpoint.get('title') or model in checkpoint.get('name')):
                        log.error(f' model: error="{model}"')
                        continue
                    model_dct = request('/sdapi/v1/modules', method='GET')
                    model_dct['load'] = round(t_load1-t_load0, 3)
                    model_dct['repo'] = model
                    write_model(model_dct)
                    loaded_model = model
                t_style0 = time.time()
                params = { 'prompt': prompt }
                for k, v in args.items():
                    params[k] = v
                log.info(f' style: n={s+1}/{len(styles)} name="{style}" args={params} fn="{fn}"')
                data = request('/sdapi/v1/txt2img', params)
                t_style1 = time.time()
                if 'images' in data and len(data['images']) > 0:
                    idx_style += 1
                    idx_images += 1
                    b64 = data['images'][0].split(',',1)[0]
                    image = Image.open(io.BytesIO(base64.b64decode(b64)))
                    size = image.size
                    info = data['info']
                    params = data['parameters']
                    log.info(f' image: size={image.width}x{image.height} time={t_style1-t_style0:.2f} info={len(info)}')
                    image.save(fn, quality=85)
                    basename = os.path.basename(fn)
                    fn = os.path.join(output_thumb, basename)
                    image.thumbnail(thumb_size, Image.Resampling.LANCZOS)
                    image.save(fn, quality=65)
                    write_images(
                        repo=model,
                        style=style,
                        image=basename,
                        size=size,
                        generate=round(t_style1-t_style0, 3),
                        params=params,
                        info=info,
                    )
                else:
                    log.error(f' model: error="{model}" style="{style}" no image')
            except Exception as e:
                if 'Connection refused' in str(e) or 'RemoteDisconnected' in str(e):
                    log.error('server offline')
                    os._exit(1)
                log.error(f' model: error="{model}" style="{style}" exception="{e}"')
        t_model1 = time.time()
        if idx_style > 0:
            log.info(f'model: name="{model}" images={idx_style} time={t_model1-t_model0:.2f}')
    t_generate1 = time.time()
    if idx_images > 0:
        log.info(f'generate: models={idx_model} images={idx_images} time={t_generate1-t_generate0:.2f}')


if __name__ == "__main__":
    logging.basicConfig(level = logging.INFO, format = '%(asctime)s %(levelname)s: %(message)s')
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    fh = RotatingFileHandler('compare.log', maxBytes=32*1024*1024, backupCount=0, encoding='utf-8', delay=True) # 10MB default for log rotation
    fh.formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')
    fh.setLevel(logging.DEBUG)
    log.addHandler(fh)
    log.info('test-all-models')
    log.info(f'output="{output_folder}" images="{output_images}" models="{output_models}"')
    read_history()
    main()
