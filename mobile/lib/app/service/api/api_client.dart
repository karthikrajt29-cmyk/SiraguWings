import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart' hide Response;

import '../../config/app_flags.dart';
import '../../constants/api_constants.dart';
import 'mock_interceptor.dart';

class ApiClient extends GetxService {
  late final Dio _dio;

  @override
  void onInit() {
    super.onInit();
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    if (AppFlags.useMockData) {
      _dio.interceptors.add(MockInterceptor());
    } else {
      _dio.interceptors.add(_AuthInterceptor(_dio));
      if (kDebugMode) {
        _dio.interceptors.add(LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (o) => debugPrint(o.toString()),
        ));
      }
    }
  }

  Dio get dio => _dio;
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;

  _AuthInterceptor(this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      // Force-refresh if token expires within 5 minutes.
      final token = await user.getIdToken(false);
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          final token = await user.getIdToken(true);
          final opts = err.requestOptions;
          opts.headers['Authorization'] = 'Bearer $token';
          final retried = await _dio.fetch(opts);
          _isRefreshing = false;
          return handler.resolve(retried);
        }
      } catch (_) {
        // Force logout on persistent 401.
        await FirebaseAuth.instance.signOut();
      } finally {
        _isRefreshing = false;
      }
    }
    handler.next(err);
  }
}
