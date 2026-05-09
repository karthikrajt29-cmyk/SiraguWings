import 'dart:convert';
import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

/// Intercepts all Dio requests in mock mode and resolves them with JSON
/// loaded from `assets/mock/`. Repositories are unchanged — they continue
/// to call `_dio.get/post/...` and parse with their existing factories.
class MockInterceptor extends Interceptor {
  static final _rng = math.Random();
  static const _baseAsset = 'assets/mock';

  // In-memory mutation store — allows demo actions like Mark Paid / Add
  // Student to update the underlying list for the rest of the session.
  static final Map<String, dynamic> _overrides = {};

  static void setOverride(String key, dynamic value) =>
      _overrides[key] = value;
  static T? readOverride<T>(String key) => _overrides[key] as T?;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    await Future<void>.delayed(
      Duration(milliseconds: 200 + _rng.nextInt(300)),
    );

    try {
      final resolved = await _resolve(options);
      handler.resolve(Response<dynamic>(
        requestOptions: options,
        data: resolved,
        statusCode: 200,
      ));
    } catch (e) {
      handler.reject(DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: options,
          statusCode: 404,
          data: {'detail': 'Mock not found: ${options.method} ${options.path}'},
        ),
        error: e,
      ));
    }
  }

  Future<dynamic> _resolve(RequestOptions options) async {
    final path = options.path;
    final method = options.method.toUpperCase();
    final query = options.queryParameters;

    // ── AUTH ──────────────────────────────────────────────────────────
    if (path == '/auth/token' && method == 'POST') {
      return _loadJson('auth/profile_owner_parent.json');
    }
    if (path == '/me/devices' || path.startsWith('/me/devices/')) {
      return {'success': true};
    }

    // ── OWNER ─────────────────────────────────────────────────────────
    if (path == '/owner/centers' && method == 'GET') {
      return _withOverride(
        key: 'owner.centers',
        defaultLoader: () => _loadJson('owner/centers.json'),
      );
    }
    if (path == '/owner/dashboard' && method == 'GET') {
      final centerId = query['center_id'] as String?;
      final file = _dashboardFileForCenter(centerId);
      return _loadJson('owner/$file');
    }

    // ── STUDENTS ──────────────────────────────────────────────────────
    final studentsListMatch =
        RegExp(r'^/owner/centers/([^/]+)/students$').firstMatch(path);
    if (studentsListMatch != null) {
      final centerId = studentsListMatch.group(1)!;
      if (method == 'GET') {
        final all = await _withOverride(
          key: 'owner.students',
          defaultLoader: () => _loadJson('owner/students.json'),
        ) as List<dynamic>;
        var filtered = all
            .where((s) => (s as Map)['center_id'] == centerId)
            .toList(growable: true);
        final q = (query['q'] as String? ?? '').toLowerCase();
        if (q.isNotEmpty) {
          filtered = filtered.where((s) {
            final m = s as Map;
            return (m['name'] as String).toLowerCase().contains(q) ||
                ((m['batch_name'] as String?) ?? '').toLowerCase().contains(q) ||
                ((m['parent_name'] as String?) ?? '').toLowerCase().contains(q);
          }).toList();
        }
        return _paged(filtered, query);
      }
      if (method == 'POST') {
        final body = options.data as Map<String, dynamic>;
        final newId = 'stu_${DateTime.now().millisecondsSinceEpoch}';
        final newStudent = {
          'id': newId,
          'center_id': centerId,
          'center_name': body['center_name'] ?? '',
          'status': 'Active',
          ...body,
        };
        final all = await _withOverride(
          key: 'owner.students',
          defaultLoader: () => _loadJson('owner/students.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all);
        mutable.insert(0, newStudent);
        _overrides['owner.students'] = mutable;
        return newStudent;
      }
    }

    final studentItemMatch =
        RegExp(r'^/owner/centers/([^/]+)/students/([^/]+)$').firstMatch(path);
    if (studentItemMatch != null) {
      final studentId = studentItemMatch.group(2)!;
      if (method == 'PUT') {
        final body = options.data as Map<String, dynamic>;
        final all = await _withOverride(
          key: 'owner.students',
          defaultLoader: () => _loadJson('owner/students.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all);
        final idx = mutable.indexWhere((s) => (s as Map)['id'] == studentId);
        if (idx != -1) {
          final updated = Map<String, dynamic>.from(mutable[idx] as Map)
            ..addAll(body);
          mutable[idx] = updated;
          _overrides['owner.students'] = mutable;
          return updated;
        }
        throw 'Student $studentId not found';
      }
      if (method == 'DELETE') {
        final all = await _withOverride(
          key: 'owner.students',
          defaultLoader: () => _loadJson('owner/students.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)
          ..removeWhere((s) => (s as Map)['id'] == studentId);
        _overrides['owner.students'] = mutable;
        return {'success': true};
      }
    }

    // ── BATCHES ───────────────────────────────────────────────────────
    final batchesListMatch =
        RegExp(r'^/owner/centers/([^/]+)/batches$').firstMatch(path);
    if (batchesListMatch != null) {
      final centerId = batchesListMatch.group(1)!;
      if (method == 'GET') {
        final all = await _withOverride(
          key: 'owner.batches',
          defaultLoader: () => _loadJson('owner/batches.json'),
        ) as List<dynamic>;
        return all.where((b) => (b as Map)['center_id'] == centerId).toList();
      }
      if (method == 'POST') {
        final body = options.data as Map<String, dynamic>;
        final newId = 'batch_${DateTime.now().millisecondsSinceEpoch}';
        final newBatch = {
          'id': newId,
          'center_id': centerId,
          'student_count': 0,
          'is_active': true,
          ...body,
        };
        final all = await _withOverride(
          key: 'owner.batches',
          defaultLoader: () => _loadJson('owner/batches.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)..add(newBatch);
        _overrides['owner.batches'] = mutable;
        return newBatch;
      }
    }

    final batchItemMatch =
        RegExp(r'^/owner/centers/([^/]+)/batches/([^/]+)$').firstMatch(path);
    if (batchItemMatch != null) {
      final batchId = batchItemMatch.group(2)!;
      if (method == 'PUT') {
        final body = options.data as Map<String, dynamic>;
        final all = await _withOverride(
          key: 'owner.batches',
          defaultLoader: () => _loadJson('owner/batches.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all);
        final idx = mutable.indexWhere((b) => (b as Map)['id'] == batchId);
        if (idx != -1) {
          final updated = Map<String, dynamic>.from(mutable[idx] as Map)
            ..addAll(body);
          mutable[idx] = updated;
          _overrides['owner.batches'] = mutable;
          return updated;
        }
        throw 'Batch $batchId not found';
      }
      if (method == 'DELETE') {
        final all = await _withOverride(
          key: 'owner.batches',
          defaultLoader: () => _loadJson('owner/batches.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)
          ..removeWhere((b) => (b as Map)['id'] == batchId);
        _overrides['owner.batches'] = mutable;
        return {'success': true};
      }
    }

    // ── TEACHERS / STAFF ──────────────────────────────────────────────
    final teachersListMatch =
        RegExp(r'^/owner/centers/([^/]+)/teachers$').firstMatch(path);
    if (teachersListMatch != null) {
      final centerId = teachersListMatch.group(1)!;
      if (method == 'GET') {
        final all = await _withOverride(
          key: 'owner.staff',
          defaultLoader: () => _loadJson('owner/staff.json'),
        ) as List<dynamic>;
        return all.where((t) => (t as Map)['center_id'] == centerId).toList();
      }
      if (method == 'POST') {
        final body = options.data as Map<String, dynamic>;
        final newId = 'tch_${DateTime.now().millisecondsSinceEpoch}';
        final newTeacher = {
          'id': newId,
          'center_id': centerId,
          'batches_count': 0,
          'is_active': true,
          ...body,
        };
        final all = await _withOverride(
          key: 'owner.staff',
          defaultLoader: () => _loadJson('owner/staff.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)..add(newTeacher);
        _overrides['owner.staff'] = mutable;
        return newTeacher;
      }
    }

    final teacherItemMatch =
        RegExp(r'^/owner/centers/([^/]+)/teachers/([^/]+)$').firstMatch(path);
    if (teacherItemMatch != null) {
      final teacherId = teacherItemMatch.group(2)!;
      if (method == 'PUT') {
        final body = options.data as Map<String, dynamic>;
        final all = await _withOverride(
          key: 'owner.staff',
          defaultLoader: () => _loadJson('owner/staff.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all);
        final idx = mutable.indexWhere((t) => (t as Map)['id'] == teacherId);
        if (idx != -1) {
          final updated = Map<String, dynamic>.from(mutable[idx] as Map)
            ..addAll(body);
          mutable[idx] = updated;
          _overrides['owner.staff'] = mutable;
          return updated;
        }
        throw 'Teacher $teacherId not found';
      }
      if (method == 'DELETE') {
        final all = await _withOverride(
          key: 'owner.staff',
          defaultLoader: () => _loadJson('owner/staff.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)
          ..removeWhere((t) => (t as Map)['id'] == teacherId);
        _overrides['owner.staff'] = mutable;
        return {'success': true};
      }
    }

    // ── FEES ──────────────────────────────────────────────────────────
    final feesListMatch =
        RegExp(r'^/owner/centers/([^/]+)/fees$').firstMatch(path);
    if (feesListMatch != null) {
      final centerId = feesListMatch.group(1)!;
      if (method == 'GET') {
        final all = await _withOverride(
          key: 'owner.fees',
          defaultLoader: () => _loadJson('owner/fees.json'),
        ) as List<dynamic>;
        final filtered = all
            .where((f) => (f as Map)['center_id'] == centerId)
            .toList(growable: false);
        return _paged(filtered, query);
      }
      if (method == 'POST') {
        final body = options.data as Map<String, dynamic>;
        final newId = 'fee_${DateTime.now().millisecondsSinceEpoch}';
        final newFee = {
          'id': newId,
          'center_id': centerId,
          'status': 'Pending',
          'paid_on': null,
          ...body,
        };
        final all = await _withOverride(
          key: 'owner.fees',
          defaultLoader: () => _loadJson('owner/fees.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)..insert(0, newFee);
        _overrides['owner.fees'] = mutable;
        return newFee;
      }
    }

    // ── FEES BULK BILL ────────────────────────────────────────────────
    final bulkBillMatch =
        RegExp(r'^/owner/centers/([^/]+)/fees/bulk$').firstMatch(path);
    if (bulkBillMatch != null && method == 'POST') {
      final centerId = bulkBillMatch.group(1)!;
      final body = options.data as Map<String, dynamic>;
      final batchId = body['batch_id'] as String;
      final billingPeriod = body['billing_period'] as String;
      final dueDate = body['due_date'] as String;
      final amount = (body['amount'] as num).toDouble();

      // Pull students for this batch.
      final allStudents = await _withOverride(
        key: 'owner.students',
        defaultLoader: () => _loadJson('owner/students.json'),
      ) as List<dynamic>;
      final batchStudents = allStudents
          .where((s) =>
              (s as Map)['center_id'] == centerId &&
              (s)['batch_id'] == batchId)
          .toList();

      final allFees = await _withOverride(
        key: 'owner.fees',
        defaultLoader: () => _loadJson('owner/fees.json'),
      ) as List<dynamic>;
      final mutableFees = List<dynamic>.from(allFees);

      final created = <Map<String, dynamic>>[];
      var counter = 0;
      for (final s in batchStudents) {
        final m = s as Map;
        // Skip if a fee for this student+period already exists.
        final exists = mutableFees.any((f) =>
            (f as Map)['student_id'] == m['id'] &&
            (f)['billing_period'] == billingPeriod);
        if (exists) continue;
        counter++;
        final newFee = {
          'id': 'fee_${DateTime.now().millisecondsSinceEpoch}_$counter',
          'student_id': m['id'],
          'student_name': m['name'],
          'center_id': centerId,
          'batch_id': batchId,
          'batch_name': m['batch_name'],
          'amount': amount,
          'due_date': dueDate,
          'status': 'Pending',
          'paid_on': null,
          'billing_period': billingPeriod,
        };
        mutableFees.insert(0, newFee);
        created.add(newFee);
      }
      _overrides['owner.fees'] = mutableFees;
      return created;
    }

    // ── FEES REMINDER ─────────────────────────────────────────────────
    final reminderMatch =
        RegExp(r'^/owner/centers/[^/]+/fees/[^/]+/reminder$').firstMatch(path);
    if (reminderMatch != null && method == 'POST') {
      return {'success': true};
    }

    final feeItemMatch =
        RegExp(r'^/owner/centers/([^/]+)/fees/([^/]+)$').firstMatch(path);
    if (feeItemMatch != null) {
      final feeId = feeItemMatch.group(2)!;
      if (method == 'PUT') {
        final body = options.data as Map<String, dynamic>;
        final all = await _withOverride(
          key: 'owner.fees',
          defaultLoader: () => _loadJson('owner/fees.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all);
        final idx = mutable.indexWhere((f) => (f as Map)['id'] == feeId);
        if (idx != -1) {
          final updated = Map<String, dynamic>.from(mutable[idx] as Map)
            ..addAll(body);
          mutable[idx] = updated;
          _overrides['owner.fees'] = mutable;
          return updated;
        }
        throw 'Fee $feeId not found';
      }
    }

    // ── PARENTS ───────────────────────────────────────────────────────
    final parentsMatch =
        RegExp(r'^/owner/centers/([^/]+)/parents$').firstMatch(path);
    if (parentsMatch != null && method == 'GET') {
      final centerId = parentsMatch.group(1)!;
      final all = await _withOverride(
        key: 'owner.parents',
        defaultLoader: () => _loadJson('owner/parents.json'),
      ) as List<dynamic>;
      return all.where((p) => (p as Map)['center_id'] == centerId).toList();
    }

    // ── REPORTS ───────────────────────────────────────────────────────
    final reportsMatch =
        RegExp(r'^/owner/centers/([^/]+)/reports$').firstMatch(path);
    if (reportsMatch != null && method == 'GET') {
      return _loadJson('owner/reports.json');
    }

    // ── ATTENDANCE ────────────────────────────────────────────────────
    final attMatch =
        RegExp(r'^/owner/centers/([^/]+)/attendance/overview$').firstMatch(path);
    if (attMatch != null && method == 'GET') {
      return _loadJson('owner/attendance_overview.json');
    }

    // ── PARENT ────────────────────────────────────────────────────────
    if (path == '/parent/children' && method == 'GET') {
      return _loadJson('parent/children.json');
    }
    final attRange =
        RegExp(r'^/parent/children/([^/]+)/attendance$').firstMatch(path);
    if (attRange != null && method == 'GET') {
      final childId = attRange.group(1)!;
      return _loadJson('parent/children_attendance_$childId.json');
    }
    if (path == '/parent/fees' && method == 'GET') {
      return _withOverride(
        key: 'parent.fees',
        defaultLoader: () => _loadJson('parent/fees.json'),
      );
    }

    // ── TEACHER CHECK-IN ──────────────────────────────────────────────
    if (path == '/teacher/checkin/history' && method == 'GET') {
      return _withOverride(
        key: 'teacher.checkin',
        defaultLoader: () => _loadJson('teacher/checkin_history.json'),
      );
    }
    if (path == '/teacher/checkin' && method == 'POST') {
      final body = options.data as Map<String, dynamic>;
      final now = DateTime.now();
      final timeStr =
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
      final newEntry = {
        'id': 'chk_${now.millisecondsSinceEpoch}',
        'date': DateFormat('yyyy-MM-dd').format(now),
        'center_id': body['center_id'],
        'center_name': body['center_name'] ?? 'SiraguWings',
        'check_in_time': timeStr,
        'latitude': body['latitude'],
        'longitude': body['longitude'],
        'status': 'Present',
      };
      final all = await _withOverride(
        key: 'teacher.checkin',
        defaultLoader: () => _loadJson('teacher/checkin_history.json'),
      ) as List<dynamic>;
      final mutable = List<dynamic>.from(all)..insert(0, newEntry);
      _overrides['teacher.checkin'] = mutable;
      return newEntry;
    }

    // ── TEACHER ───────────────────────────────────────────────────────
    if (path == '/teacher/stats' && method == 'GET') {
      return _loadJson('teacher/stats.json');
    }
    if (path == '/teacher/batches' && method == 'GET') {
      return _withOverride(
        key: 'teacher.batches',
        defaultLoader: () => _loadJson('teacher/batches.json'),
      );
    }
    final teacherAttMatch =
        RegExp(r'^/teacher/batches/([^/]+)/attendance$').firstMatch(path);
    if (teacherAttMatch != null) {
      final batchId = teacherAttMatch.group(1)!;
      if (method == 'GET') {
        return _withOverride(
          key: 'teacher.attendance.$batchId',
          defaultLoader: () => _loadJson('teacher/attendance_$batchId.json'),
        );
      }
      if (method == 'POST') {
        final body = options.data as Map<String, dynamic>;
        final marks = body['marks'] as List<dynamic>;
        final existing = await _withOverride(
          key: 'teacher.attendance.$batchId',
          defaultLoader: () => _loadJson('teacher/attendance_$batchId.json'),
        ) as Map<String, dynamic>;
        final items = List<dynamic>.from(existing['items'] as List);
        for (final mark in marks) {
          final m = mark as Map<String, dynamic>;
          final idx = items.indexWhere(
              (s) => (s as Map)['student_id'] == m['student_id']);
          if (idx != -1) {
            final updated = Map<String, dynamic>.from(items[idx] as Map)
              ..['status'] = m['status'];
            items[idx] = updated;
          }
        }
        final updated = Map<String, dynamic>.from(existing)..['items'] = items;
        _overrides['teacher.attendance.$batchId'] = updated;
        return {'saved': marks.length, 'success': true};
      }
    }

    // ── CHAT ──────────────────────────────────────────────────────────
    if (path == '/chat/conversations' && method == 'GET') {
      final role = query['role'] as String? ?? 'Teacher';
      final file = role == 'Parent'
          ? 'chat/conversations_parent.json'
          : 'chat/conversations_teacher.json';
      return _withOverride(
        key: 'chat.conversations.$role',
        defaultLoader: () => _loadJson(file),
      );
    }

    final msgListMatch =
        RegExp(r'^/chat/conversations/([^/]+)/messages$').firstMatch(path);
    if (msgListMatch != null) {
      final convId = msgListMatch.group(1)!;
      if (method == 'GET') {
        return _withOverride(
          key: 'chat.messages.$convId',
          defaultLoader: () => _loadJson('chat/messages_$convId.json'),
        );
      }
      if (method == 'POST') {
        final body = options.data as Map<String, dynamic>;
        final now = DateTime.now();
        final newMsg = {
          'id': 'msg_${now.millisecondsSinceEpoch}',
          'sender_id': body['sender_id'] ?? 'unknown',
          'sender_name': body['sender_name'] ?? 'Unknown',
          'content': body['content'] as String,
          'sent_at': now.toIso8601String(),
          'is_read': false,
          'type': 'text',
        };
        final all = await _withOverride(
          key: 'chat.messages.$convId',
          defaultLoader: () => _loadJson('chat/messages_$convId.json'),
        ) as List<dynamic>;
        final mutable = List<dynamic>.from(all)..add(newMsg);
        _overrides['chat.messages.$convId'] = mutable;
        return newMsg;
      }
    }

    // ── MATERIALS ─────────────────────────────────────────────────────
    if (path == '/materials' && method == 'GET') {
      return _withOverride(
        key: 'materials',
        defaultLoader: () => _loadJson('materials/list.json'),
      );
    }
    if (path == '/materials' && method == 'POST') {
      final body = options.data as Map<String, dynamic>;
      final now = DateTime.now();
      final newMat = {
        'id': 'mat_${now.millisecondsSinceEpoch}',
        'uploaded_at': now.toIso8601String(),
        'due_date': null,
        ...body,
      };
      final all = await _withOverride(
        key: 'materials',
        defaultLoader: () => _loadJson('materials/list.json'),
      ) as List<dynamic>;
      final mutable = List<dynamic>.from(all)..insert(0, newMat);
      _overrides['materials'] = mutable;
      return newMat;
    }
    final matItemMatch = RegExp(r'^/materials/([^/]+)$').firstMatch(path);
    if (matItemMatch != null && method == 'DELETE') {
      final matId = matItemMatch.group(1)!;
      final all = await _withOverride(
        key: 'materials',
        defaultLoader: () => _loadJson('materials/list.json'),
      ) as List<dynamic>;
      final mutable = List<dynamic>.from(all)
        ..removeWhere((m) => (m as Map)['id'] == matId);
      _overrides['materials'] = mutable;
      return {'success': true};
    }

    // ── ANNOUNCEMENTS ─────────────────────────────────────────────────
    if (path == '/announcements' && method == 'GET') {
      return _withOverride(
        key: 'announcements',
        defaultLoader: () => _loadJson('announcements/list.json'),
      );
    }
    if (path == '/announcements' && method == 'POST') {
      final body = options.data as Map<String, dynamic>;
      final now = DateTime.now();
      final targetBatch = body['target_batch'] as String? ?? 'All';
      final newAnn = {
        'id': 'ann_${now.millisecondsSinceEpoch}',
        'created_at': now.toIso8601String(),
        'target_role': 'Parent',
        'sent_to': targetBatch == 'All' ? 8 : 4,
        ...body,
      };
      final all = await _withOverride(
        key: 'announcements',
        defaultLoader: () => _loadJson('announcements/list.json'),
      ) as List<dynamic>;
      final mutable = List<dynamic>.from(all)..insert(0, newAnn);
      _overrides['announcements'] = mutable;
      return newAnn;
    }

    // ── NOTIFICATIONS ─────────────────────────────────────────────────
    if (path.endsWith('/notifications') && method == 'GET') {
      final role = query['role'] as String? ?? 'owner';
      return _loadJson('notifications/${role.toLowerCase()}.json');
    }

    // ── SOS ───────────────────────────────────────────────────────────
    if (path == '/sos/alerts' && method == 'GET') {
      return _loadJson('sos/alerts.json');
    }

    throw 'No mock handler for $method $path';
  }

  String _dashboardFileForCenter(String? centerId) {
    if (centerId == null) return 'dashboard_center_a.json';
    if (centerId.endsWith('b')) return 'dashboard_center_b.json';
    return 'dashboard_center_a.json';
  }

  Future<dynamic> _loadJson(String relPath) async {
    final raw = await rootBundle.loadString('$_baseAsset/$relPath');
    return jsonDecode(raw);
  }

  Future<dynamic> _withOverride({
    required String key,
    required Future<dynamic> Function() defaultLoader,
  }) async {
    if (_overrides.containsKey(key)) return _overrides[key];
    final loaded = await defaultLoader();
    _overrides[key] = loaded;
    return loaded;
  }

  Map<String, dynamic> _paged(List<dynamic> items, Map<String, dynamic> q) {
    final page = int.tryParse('${q['page'] ?? 1}') ?? 1;
    final size = int.tryParse('${q['size'] ?? 25}') ?? 25;
    final start = (page - 1) * size;
    final end = math.min(start + size, items.length);
    final slice = (start < items.length) ? items.sublist(start, end) : [];
    return {
      'items': slice,
      'total': items.length,
      'page': page,
      'size': size,
      'total_pages': math.max(1, (items.length + size - 1) ~/ size),
    };
  }
}
