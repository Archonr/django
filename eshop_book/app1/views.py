from django.shortcuts import render
from django.http import HttpResponse
from .models import Book
from .models import Project
# from .models import *

from django.http.response import HttpResponse, HttpResponseBadRequest, HttpResponseServerError
from django.shortcuts import render_to_response, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.cache import never_cache
from django.utils import timezone
from django.db.models import ObjectDoesNotExist
from django.core.paginator import Paginator
from django.contrib.auth.models import User
from django.conf import settings
import re
import json
#import .models
import paramiko
#import ldap
#import cache




LOGIN_URL = '/accounts/login/'


# Create your views here.

def index(request):
    #return HttpResponse('Hello Django!')
    ctx = {}
    ctx['a'] = 45
    all_books = Book.objects.all()
    ctx['all_books'] = all_books
    for book in all_books:
        print (book.title)
    #print (all_books)
    return render(request , 'index.html')

class ProjectTreeNode:
    def __init__(self, id, text, parent_id):
        self.id = id
        self.text = text
        self.parent_id = parent_id
        self.nodes = list()

    def append_child(self, node):
        if node.parent_id == self.id:
            self.nodes.append(node)
            return True

        if self.nodes:
            for c in self.nodes:
                if c.append_child(node):
                    return True

        return False

class ProjectTreeNodeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        assert isinstance(obj, ProjectTreeNode)
        data = {
            'id': obj.id,
            'text': obj.text,
            'parent_id': obj.parent_id
        }

        if obj.nodes:
            data['nodes'] = obj.nodes

        return data

def make_project_tree(projects):
    floor = list()

    for p in projects:
        node = ProjectTreeNode(p.id, p.name, p.parent and p.parent.id or -1)

        if node.parent_id == -1:
            floor.append(node)
            continue

        try:
            for n in floor:
                if n.append_child(node):
                    raise StopIteration
            floor.append(node)
        except StopIteration:
            pass

    return floor

@login_required(login_url=LOGIN_URL)
def greeting(request):
    projects = Project.objects.filter(users__id=request.user.id) \
        .extra(select={'null_ordering': 'parent_id is null'}).order_by('-null_ordering', 'parent')
    projects_tree = make_project_tree(projects)

    return render_to_response('greeting.html', {
        'projects': projects,
        'projects_tree': json.dumps(projects_tree, cls=ProjectTreeNodeJSONEncoder)
    })
@login_required(login_url=LOGIN_URL)

def projects(request, **kwargs):
    project_id = int(kwargs['project_id'])
    projects = Project.objects.filter(users__id=request.user.id).order_by('name')
    current = get_object_or_404(projects, pk=project_id)

    f = open('/home/v-korkach/1.txt', 'r')
    file_content = f.read()
    f.close()
    # context = {'file_content': file_content}
    # context = file_content
    return render_to_response('projects.html', {
        'user': request.user.id,
        'projects': projects,
        'project_id': current.id,
        'project_name': current.name,
        'is_staff': request.user.is_staff,
        'file_content': file_content
    })

from django.http import HttpResponse


from .calc import calc_obj
def calculator(request):
    ctx = {}
    ctx['operations'] = calc_obj.keys()

    if request.method == 'GET':
        print('GET!')
    elif request.method == 'POST':
        try:
            first_num = float(request.POST.get('first_num'))
            operation = request.POST.get('operation')
            second_num = float(request.POST.get('second_num'))
            result = calc_obj[operation](first_num, second_num)
            print (result)
            ctx['result'] = result
            # print ('POST!!!', first_num, operation, second_num)
        except (ValueError, ZeroDivisionError) as e:
            ctx['msg'] = e

    return render(request, 'calculator.html', ctx)
