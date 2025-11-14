"""Routes API pour l'analyse IA"""
from flask import jsonify, request
from analysis import (
    get_analysis_stats,
    process_documents_batch,
    stop_analysis,
    get_api_key,
    set_api_key,
)
import threading
import os

analysis_state = {'running': False, 'progress': None}

def run_analysis_in_background(api_key):
    def callback(stats):
        analysis_state['progress'] = stats
    try:
        analysis_state['running'] = True
        process_documents_batch(api_key, callback=callback)
    finally:
        analysis_state['running'] = False

def register_analysis_routes(app):
    @app.route('/api/analysis/stats')
    def get_stats():
        return jsonify(get_analysis_stats())
    
    @app.route('/api/analysis/start', methods=['POST'])
    def start_analysis():
        if analysis_state['running']:
            return jsonify({'error': 'En cours'}), 400
        data = request.get_json() or {}
        api_key = data.get('api_key') or get_api_key() or os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'Clé requise'}), 400
        if data.get('remember_key'):
            set_api_key(api_key)
        threading.Thread(target=run_analysis_in_background, args=(api_key,)).start()
        return jsonify({'success': True})
    
    @app.route('/api/analysis/progress')
    def get_progress():
        return jsonify({'running': analysis_state['running'], 'progress': analysis_state['progress']})

    @app.route('/api/analysis/stop', methods=['POST'])
    def stop():
        if analysis_state['running']:
            stop_analysis()
        return jsonify({'success': True, 'running': analysis_state['running']})
